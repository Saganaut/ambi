"""Readiness callback to the Ambi backend's internal image-variant endpoint."""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from typing import TYPE_CHECKING, Any

import requests

if TYPE_CHECKING:
    from .config import WorkerConfig
    from .variants import VariantResult

AUTH_HEADER = "X-Ambi-Worker-Secret"
TIMEOUT_SECONDS = 10
MAX_TRIES = 3
RETRY_DELAYS_SECONDS = (1.0, 2.0)

logger = logging.getLogger(__name__)


class CallbackFailed(RuntimeError):
    """Raised when the backend could not be told about a result after every retry."""


def report(
    result: VariantResult,
    cfg: WorkerConfig,
    attempt: int = 1,
    *,
    sleep: Callable[[float], None] = time.sleep,
) -> None:
    """POST ``result`` to the backend, retrying transient failures.

    Tried :data:`MAX_TRIES` times with :data:`RETRY_DELAYS_SECONDS` backoff. If
    every try fails the exception propagates, and the caller deliberately leaves
    the queue message undeleted so the whole job is redelivered — the callback is
    idempotent on the backend, so a duplicate report is harmless.

    :param attempt: the message's delivery count, echoed to the backend for
        observability (SQS ``ApproximateReceiveCount``).
    """
    payload = to_payload(result, attempt)
    headers = {AUTH_HEADER: cfg.callback_secret}

    failure: CallbackFailed | None = None
    for try_index in range(MAX_TRIES):
        try:
            response = requests.post(
                cfg.callback_url, json=payload, headers=headers, timeout=TIMEOUT_SECONDS
            )
        except requests.RequestException as exc:
            failure = CallbackFailed(f"callback to {cfg.callback_url} failed: {exc}")
        else:
            if 200 <= response.status_code < 300:
                logger.info(
                    "Reported %s (%s tier(s), terminal=%s)",
                    result.key_root,
                    len(result.ready_tiers),
                    result.terminal,
                )
                return
            failure = CallbackFailed(
                f"callback to {cfg.callback_url} returned HTTP {response.status_code}"
            )

        logger.warning("Callback try %s/%s failed: %s", try_index + 1, MAX_TRIES, failure)
        if try_index < len(RETRY_DELAYS_SECONDS):
            sleep(RETRY_DELAYS_SECONDS[try_index])

    raise failure if failure else CallbackFailed("callback failed")


def to_payload(result: VariantResult, attempt: int) -> dict[str, Any]:
    """The JSON body the backend's ``ImageVariantsReadyRequest`` record deserializes."""
    return {
        "keyRoot": result.key_root,
        "readyTiers": list(result.ready_tiers),
        "terminal": result.terminal,
        "attempt": attempt,
    }
