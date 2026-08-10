"""Tier rendering (pure) and the per-message processing core shared by both entry points."""

from __future__ import annotations

import logging
from collections.abc import Mapping
from dataclasses import dataclass, field
from io import BytesIO
from typing import TYPE_CHECKING

from PIL import Image, ImageOps, UnidentifiedImageError

from .messages import variant_key

if TYPE_CHECKING:
    from .config import WorkerConfig
    from .messages import VariantJob
    from .storage import ObjectStore

WEBP_CONTENT_TYPE = "image/webp"
WEBP_QUALITY = 82
WEBP_METHOD = 4

REASON_SOURCE_MISSING = "source_missing"
REASON_UNDECODABLE = "undecodable"

_ALPHA_MODES = frozenset({"RGBA", "LA", "La", "RGBa", "PA"})

logger = logging.getLogger(__name__)


class UndecodableImage(ValueError):
    """Raised when the source bytes are not a decodable image."""


@dataclass(frozen=True, slots=True)
class VariantResult:
    """What the worker managed to produce for one job, as reported to the backend."""

    key_root: str
    ready_tiers: list[str] = field(default_factory=list)
    terminal: bool = False
    reason: str | None = None


def render_tiers(source: bytes, tiers: Mapping[str, int]) -> dict[str, bytes]:
    """Encode one WebP rendition per tier.

    Each rendition is fit *within* a ``maxEdge x maxEdge`` box preserving aspect
    ratio and is never upscaled: a source smaller than the box is encoded at its
    own size, so small originals share dimensions across the larger tiers.

    :raises UndecodableImage: when ``source`` is not a readable image.
    """
    base = _decode(source)
    rendered: dict[str, bytes] = {}
    for tier, max_edge in tiers.items():
        rendition = base.copy()
        rendition.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
        buffer = BytesIO()
        rendition.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
        rendered[tier] = buffer.getvalue()
    return rendered


def process_image(job: VariantJob, store: ObjectStore, cfg: WorkerConfig) -> VariantResult:
    """Render and store every tier ``job`` asks for, then describe what landed.

    Each rendition is PUT to storage *before* it appears in
    :attr:`VariantResult.ready_tiers`, which is the ordering invariant the
    backend relies on: a tier is only ever reported ready once its object exists.

    A missing source object is non-terminal (the upload's PUT may not have landed
    yet, or the image was deleted) and reports zero tiers; bytes that cannot be
    decoded are terminal, because redelivery can never change the outcome.
    Storage failures are *not* caught — they propagate so the caller leaves the
    message on the queue for redelivery.
    """
    del cfg

    source = store.get(job.bucket, job.src_key)
    if source is None:
        return VariantResult(job.key_root, [], terminal=False, reason=REASON_SOURCE_MISSING)

    try:
        rendered = render_tiers(source, job.bounds())
    except UndecodableImage:
        logger.exception("Cannot decode s3://%s/%s; giving up", job.bucket, job.src_key)
        return VariantResult(job.key_root, [], terminal=True, reason=REASON_UNDECODABLE)

    ready: list[str] = []
    for tier, body in rendered.items():
        store.put(job.bucket, variant_key(job.key_root, tier), body, WEBP_CONTENT_TYPE)
        ready.append(tier)

    logger.info("Rendered %s tier(s) for %s", len(ready), job.key_root)
    return VariantResult(job.key_root, ready, terminal=True, reason=None)


def _decode(source: bytes) -> Image.Image:
    """Decode ``source`` into upright pixels in a WebP-encodable mode.

    The EXIF orientation tag is baked into the pixels here because the renditions
    are re-encoded as WebP without metadata: a browser auto-rotates the untouched
    original, so a rendition that skipped the transpose would appear sideways.

    :raises UndecodableImage: when ``source`` is not a readable image.
    """
    try:
        opened = Image.open(BytesIO(source))
        opened.load()
        upright = ImageOps.exif_transpose(opened)
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as exc:
        raise UndecodableImage(str(exc)) from exc
    return _normalise(upright if upright is not None else opened)


def _normalise(image: Image.Image) -> Image.Image:
    """Coerce to a mode the WebP encoder accepts, keeping transparency where present."""
    if image.mode in {"RGB", "RGBA"}:
        return image
    if image.mode == "P":
        return image.convert("RGBA" if "transparency" in image.info else "RGB")
    if image.mode in _ALPHA_MODES:
        return image.convert("RGBA")
    return image.convert("RGB")
