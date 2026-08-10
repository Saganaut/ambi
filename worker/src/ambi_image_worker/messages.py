"""The image-variant queue message: schema, parsing, and variant-key derivation.

The backend publishes the JSON below; variant keys are deliberately *not* in the
message — both sides derive them from ``keyRoot``, and a test on each side pins
the derived string so the two implementations cannot drift.

.. code-block:: json

    {"version": 1, "keyRoot": "gallery/9f2c", "srcKey": "gallery/9f2c/original",
     "bucket": "ambi-images", "contentType": "image/jpeg",
     "tiers": [{"tier": "XS", "maxEdge": 64}], "requestedAt": "2026-08-10T12:00:00Z"}
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

SCHEMA_VERSION = 1
VARIANT_EXTENSION = ".webp"


class UnsupportedMessage(ValueError):
    """Raised when a queue message cannot be understood by this worker."""


@dataclass(frozen=True, slots=True)
class TierRequest:
    """One requested rendition: the tier's name and its bounding-box edge in pixels."""

    tier: str
    max_edge: int


@dataclass(frozen=True, slots=True)
class VariantJob:
    """A parsed, validated variant job."""

    version: int
    key_root: str
    src_key: str
    bucket: str
    content_type: str
    tiers: tuple[TierRequest, ...]
    requested_at: str

    def bounds(self) -> dict[str, int]:
        """Tier name to bounding-box edge, in the order the backend requested them."""
        return {tier.tier: tier.max_edge for tier in self.tiers}

    def key_for(self, tier: str) -> str:
        """This job's storage key for ``tier``."""
        return variant_key(self.key_root, tier)


def variant_key(key_root: str, tier: str) -> str:
    """The canonical variant key: ``{keyRoot}/{tier-lowercase}.webp``."""
    return f"{key_root}/{tier.lower()}{VARIANT_EXTENSION}"


def parse_job(raw: str) -> VariantJob:
    """Parse an SQS message body into a :class:`VariantJob`.

    :raises UnsupportedMessage: on malformed JSON, a version this worker does
        not implement, or a missing/invalid field.
    """
    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, TypeError) as exc:
        raise UnsupportedMessage(f"body is not valid JSON: {exc}") from exc

    if not isinstance(payload, dict):
        raise UnsupportedMessage("body is not a JSON object")

    version = payload.get("version")
    if version != SCHEMA_VERSION:
        raise UnsupportedMessage(f"unsupported message version {version!r}")

    return VariantJob(
        version=SCHEMA_VERSION,
        key_root=_required(payload, "keyRoot"),
        src_key=_required(payload, "srcKey"),
        bucket=_required(payload, "bucket"),
        content_type=_optional(payload, "contentType"),
        tiers=_tiers(payload.get("tiers")),
        requested_at=_optional(payload, "requestedAt"),
    )


def _required(payload: dict[str, Any], field: str) -> str:
    value = payload.get(field)
    if not isinstance(value, str) or not value.strip():
        raise UnsupportedMessage(f"missing or blank field {field!r}")
    return value


def _optional(payload: dict[str, Any], field: str) -> str:
    value = payload.get(field)
    return value if isinstance(value, str) else ""


def _tiers(raw: Any) -> tuple[TierRequest, ...]:
    if not isinstance(raw, list) or not raw:
        raise UnsupportedMessage("field 'tiers' must be a non-empty array")

    parsed: list[TierRequest] = []
    for entry in raw:
        if not isinstance(entry, dict):
            raise UnsupportedMessage("each 'tiers' entry must be an object")
        name = entry.get("tier")
        max_edge = entry.get("maxEdge")
        if not isinstance(name, str) or not name.strip():
            raise UnsupportedMessage(f"invalid tier name {name!r}")
        if not isinstance(max_edge, int) or isinstance(max_edge, bool) or max_edge <= 0:
            raise UnsupportedMessage(f"invalid maxEdge {max_edge!r} for tier {name!r}")
        parsed.append(TierRequest(tier=name, max_edge=max_edge))
    return tuple(parsed)
