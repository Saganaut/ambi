"""AWS Lambda entry point: the same core, driven by an SQS event source mapping."""

from __future__ import annotations

import logging
from typing import Any

from .callback import report
from .config import WorkerConfig, configure_logging
from .messages import parse_job
from .storage import ObjectStore, S3ObjectStore
from .variants import process_image

RECEIVE_COUNT_ATTRIBUTE = "ApproximateReceiveCount"

logger = logging.getLogger(__name__)

_runtime: tuple[WorkerConfig, ObjectStore] | None = None


def runtime() -> tuple[WorkerConfig, ObjectStore]:
    """Config and object store, built once per execution environment and reused warm."""
    global _runtime
    if _runtime is None:
        cfg = WorkerConfig.from_env()
        configure_logging(cfg.log_level)
        cfg.require_callback()
        _runtime = (cfg, S3ObjectStore.from_config(cfg))
    return _runtime


def handler(event: dict[str, Any], context: Any = None) -> dict[str, Any]:
    """Process every record, reporting the failed ones as partial batch failures.

    Returning ``batchItemFailures`` requires ``ReportBatchItemFailures`` on the
    event source mapping; without it a single bad record would redeliver the
    whole batch.
    """
    del context

    cfg, store = runtime()
    failures: list[dict[str, str]] = []

    for record in event.get("Records", []):
        identifier = record.get("messageId", "")
        attempt = receive_count(record)
        try:
            job = parse_job(record.get("body", ""))
            result = process_image(job, store, cfg)
            report(result, cfg, attempt)
        except Exception:
            logger.exception("Record %s failed on attempt %s", identifier, attempt)
            failures.append({"itemIdentifier": identifier})

    return {"batchItemFailures": failures}


def receive_count(record: dict[str, Any]) -> int:
    """The record's SQS delivery count, defaulting to a first attempt."""
    raw = record.get("attributes", {}).get(RECEIVE_COUNT_ATTRIBUTE, "1")
    try:
        return int(raw)
    except (TypeError, ValueError):
        return 1
