"""Shared fixtures: a dict-backed object store and real Pillow-encoded sample images."""

from __future__ import annotations

import json
from io import BytesIO

import pytest
from PIL import Image, features

from ambi_image_worker.config import WorkerConfig

TIERS = (("XS", 64), ("SM", 200), ("MD", 480), ("LG", 960), ("XL", 1600))

CALLBACK_URL = "http://backend:8080/api/internal/image-variants"
CALLBACK_SECRET = "test-only-worker-callback-secret-at-least-32-chars"


class FakeObjectStore:
    """An in-memory ObjectStore: no moto, no network, and PUT order is observable."""

    def __init__(self, objects: dict[tuple[str, str], bytes] | None = None) -> None:
        self.objects: dict[tuple[str, str], bytes] = dict(objects or {})
        self.content_types: dict[tuple[str, str], str] = {}
        self.puts: list[tuple[str, str]] = []
        self.gets: list[tuple[str, str]] = []
        self.put_error: Exception | None = None

    def get(self, bucket: str, key: str) -> bytes | None:
        self.gets.append((bucket, key))
        return self.objects.get((bucket, key))

    def put(self, bucket: str, key: str, body: bytes, content_type: str) -> None:
        if self.put_error is not None:
            raise self.put_error
        self.objects[(bucket, key)] = body
        self.content_types[(bucket, key)] = content_type
        self.puts.append((bucket, key))

    def keys(self, bucket: str) -> set[str]:
        return {key for stored_bucket, key in self.objects if stored_bucket == bucket}


def encode(width: int, height: int, image_format: str, mode: str = "RGB") -> bytes:
    """A real, decodable image of the requested size, format, and mode."""
    tile = Image.new("RGB", (16, 16))
    tile.putdata([((n * 17) % 256, (n * 29) % 256, (n * 43) % 256) for n in range(16 * 16)])
    image = tile.resize((width, height), Image.Resampling.NEAREST)

    if mode == "RGBA":
        image = image.convert("RGBA")
        image.putalpha(Image.linear_gradient("L").resize((width, height)))
    elif mode != "RGB":
        image = image.convert(mode)

    buffer = BytesIO()
    image.save(buffer, format=image_format)
    return buffer.getvalue()


def png_bytes(width: int = 1000, height: int = 500, mode: str = "RGB") -> bytes:
    return encode(width, height, "PNG", mode)


def jpeg_bytes(width: int = 1000, height: int = 500) -> bytes:
    return encode(width, height, "JPEG")


def gif_bytes(width: int = 300, height: int = 150) -> bytes:
    return encode(width, height, "GIF", mode="P")


def avif_bytes(width: int = 300, height: int = 150) -> bytes:
    return encode(width, height, "AVIF")


def avif_supported() -> bool:
    return bool(features.check("avif"))


def job_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "version": 1,
        "keyRoot": "gallery/9f2c",
        "srcKey": "gallery/9f2c/original",
        "bucket": "ambi-images",
        "contentType": "image/jpeg",
        "tiers": [{"tier": tier, "maxEdge": max_edge} for tier, max_edge in TIERS],
        "requestedAt": "2026-08-10T12:00:00Z",
    }
    payload.update(overrides)
    return payload


def job_json(**overrides: object) -> str:
    return json.dumps(job_payload(**overrides))


@pytest.fixture
def store() -> FakeObjectStore:
    return FakeObjectStore()


@pytest.fixture
def cfg() -> WorkerConfig:
    return WorkerConfig(
        queue_url="http://elasticmq:9324/queue/ambi-image-variants",
        sqs_endpoint="http://elasticmq:9324",
        aws_region="elasticmq",
        s3_endpoint="http://garage:3900",
        s3_region="garage",
        s3_bucket="ambi-images",
        s3_access_key_id="key",
        s3_secret_access_key="secret",
        s3_path_style=True,
        callback_url=CALLBACK_URL,
        callback_secret=CALLBACK_SECRET,
        wait_seconds=20,
        max_messages=10,
        visibility_timeout=120,
        log_level="INFO",
    )
