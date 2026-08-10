"""Environment-driven worker configuration, resolved once at start-up."""

from __future__ import annotations

import logging
import os
from collections.abc import Mapping
from dataclasses import dataclass

ENV_PREFIX = "AMBI_WORKER_"

DEFAULT_WAIT_SECONDS = 20
DEFAULT_MAX_MESSAGES = 10
DEFAULT_VISIBILITY_TIMEOUT = 0
DEFAULT_LOG_LEVEL = "INFO"

LOG_FORMAT = "%(asctime)s %(levelname)-5s %(name)s %(message)s"


class MissingConfiguration(RuntimeError):
    """Raised when a required ``AMBI_WORKER_*`` variable is unset or blank."""


@dataclass(frozen=True, slots=True)
class WorkerConfig:
    """Every knob the worker reads, already coerced from its ``AMBI_WORKER_*`` variable."""

    queue_url: str
    sqs_endpoint: str
    aws_region: str
    s3_endpoint: str
    s3_region: str
    s3_bucket: str
    s3_access_key_id: str
    s3_secret_access_key: str
    s3_path_style: bool
    callback_url: str
    callback_secret: str
    wait_seconds: int
    max_messages: int
    visibility_timeout: int
    log_level: str

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> WorkerConfig:
        """Build a config from ``env`` (the process environment by default).

        Endpoint overrides are optional: left blank, boto3 resolves the real AWS
        endpoints, which is what the Lambda deployment wants.
        """
        source: Mapping[str, str] = os.environ if env is None else env
        return cls(
            queue_url=_text(source, "QUEUE_URL"),
            sqs_endpoint=_text(source, "SQS_ENDPOINT"),
            aws_region=_text(source, "AWS_REGION"),
            s3_endpoint=_text(source, "S3_ENDPOINT"),
            s3_region=_text(source, "S3_REGION"),
            s3_bucket=_text(source, "S3_BUCKET"),
            s3_access_key_id=_text(source, "S3_ACCESS_KEY_ID"),
            s3_secret_access_key=_text(source, "S3_SECRET_ACCESS_KEY"),
            s3_path_style=_flag(source, "S3_PATH_STYLE", default=False),
            callback_url=_text(source, "CALLBACK_URL"),
            callback_secret=_text(source, "CALLBACK_SECRET"),
            wait_seconds=_number(source, "WAIT_SECONDS", DEFAULT_WAIT_SECONDS),
            max_messages=_number(source, "MAX_MESSAGES", DEFAULT_MAX_MESSAGES),
            visibility_timeout=_number(source, "VISIBILITY_TIMEOUT", DEFAULT_VISIBILITY_TIMEOUT),
            log_level=_text(source, "LOG_LEVEL") or DEFAULT_LOG_LEVEL,
        )

    def require_callback(self) -> None:
        """Fail fast when the callback cannot be made, so no work is wasted."""
        missing = [
            ENV_PREFIX + name
            for name, value in (
                ("CALLBACK_URL", self.callback_url),
                ("CALLBACK_SECRET", self.callback_secret),
            )
            if not value
        ]
        if missing:
            raise MissingConfiguration(", ".join(missing))

    def require_queue(self) -> str:
        """The queue URL to long-poll; required by the poller, unused on Lambda."""
        if not self.queue_url:
            raise MissingConfiguration(ENV_PREFIX + "QUEUE_URL")
        return self.queue_url


def configure_logging(level: str = DEFAULT_LOG_LEVEL) -> None:
    """Install the worker's root log handler at ``level``."""
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format=LOG_FORMAT,
        force=True,
    )


def _text(env: Mapping[str, str], name: str, default: str = "") -> str:
    return env.get(ENV_PREFIX + name, default).strip()


def _number(env: Mapping[str, str], name: str, default: int) -> int:
    raw = _text(env, name)
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise MissingConfiguration(f"{ENV_PREFIX}{name} is not an integer: {raw!r}") from exc


def _flag(env: Mapping[str, str], name: str, *, default: bool) -> bool:
    raw = _text(env, name).lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}
