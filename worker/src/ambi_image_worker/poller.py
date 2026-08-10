"""Long-polling entry point: the container the local compose stack runs."""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from typing import Any

import boto3
from botocore.config import Config

from .callback import report
from .config import WorkerConfig, configure_logging
from .messages import UnsupportedMessage, parse_job
from .storage import ObjectStore, S3ObjectStore, client_kwargs
from .variants import process_image

RECEIVE_COUNT_ATTRIBUTE = "ApproximateReceiveCount"
ERROR_BACKOFF_SECONDS = 5.0

logger = logging.getLogger(__name__)


def main() -> None:
    """Resolve config, then poll until the process is killed."""
    cfg = WorkerConfig.from_env()
    configure_logging(cfg.log_level)
    cfg.require_queue()
    cfg.require_callback()
    run_forever(build_sqs_client(cfg), S3ObjectStore.from_config(cfg), cfg)


def build_sqs_client(cfg: WorkerConfig) -> Any:
    """Construct the boto3 SQS client, honouring the ElasticMQ endpoint override."""
    return boto3.client(
        "sqs",
        config=Config(retries={"max_attempts": 3, "mode": "standard"}),
        **client_kwargs(
            endpoint=cfg.sqs_endpoint,
            region=cfg.aws_region,
            access_key="",
            secret_key="",
        ),
    )


def run_forever(
    sqs: Any,
    store: ObjectStore,
    cfg: WorkerConfig,
    *,
    should_continue: Callable[[], bool] = lambda: True,
) -> None:
    """Receive/process/delete forever, backing off after an unexpected loop error."""
    logger.info("Polling %s", cfg.queue_url)
    while should_continue():
        try:
            run_once(sqs, store, cfg)
        except Exception:
            logger.exception("Receive loop failed; retrying in %ss", ERROR_BACKOFF_SECONDS)
            time.sleep(ERROR_BACKOFF_SECONDS)


def run_once(sqs: Any, store: ObjectStore, cfg: WorkerConfig) -> int:
    """Drain one long-poll batch; returns how many messages were received."""
    request: dict[str, Any] = {
        "QueueUrl": cfg.queue_url,
        "MaxNumberOfMessages": cfg.max_messages,
        "WaitTimeSeconds": cfg.wait_seconds,
        "AttributeNames": [RECEIVE_COUNT_ATTRIBUTE],
    }
    if cfg.visibility_timeout > 0:
        request["VisibilityTimeout"] = cfg.visibility_timeout

    messages = sqs.receive_message(**request).get("Messages", [])
    for message in messages:
        if handle_message(message, store, cfg):
            sqs.delete_message(QueueUrl=cfg.queue_url, ReceiptHandle=message["ReceiptHandle"])
    return len(messages)


def handle_message(message: dict[str, Any], store: ObjectStore, cfg: WorkerConfig) -> bool:
    """Process one message; ``True`` means it may be deleted from the queue.

    A message is only deletable once the backend has acknowledged the report, so
    any failure — undecodable schema, storage error, unreachable backend — leaves
    it on the queue for redelivery and, after the queue's ``maxReceiveCount``,
    the dead-letter queue.
    """
    identifier = message.get("MessageId", "<unknown>")
    attempt = receive_count(message)
    try:
        job = parse_job(message.get("Body", ""))
    except UnsupportedMessage:
        logger.exception("Message %s is not a job this worker understands", identifier)
        return False

    try:
        result = process_image(job, store, cfg)
        report(result, cfg, attempt)
    except Exception:
        logger.exception(
            "Message %s (%s) failed on attempt %s; leaving it queued",
            identifier,
            job.key_root,
            attempt,
        )
        return False
    return True


def receive_count(message: dict[str, Any]) -> int:
    """The message's SQS delivery count, defaulting to a first attempt."""
    raw = message.get("Attributes", {}).get(RECEIVE_COUNT_ATTRIBUTE, "1")
    try:
        return int(raw)
    except (TypeError, ValueError):
        return 1


if __name__ == "__main__":
    main()
