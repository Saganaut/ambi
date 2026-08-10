"""Queue-message schema and the cross-language variant-key derivation."""

from __future__ import annotations

import json

import pytest

from ambi_image_worker.messages import (
    SCHEMA_VERSION,
    UnsupportedMessage,
    parse_job,
    variant_key,
)
from conftest import TIERS, job_json, job_payload


def test_parses_the_documented_message():
    job = parse_job(job_json())

    assert job.version == SCHEMA_VERSION
    assert job.key_root == "gallery/9f2c"
    assert job.src_key == "gallery/9f2c/original"
    assert job.bucket == "ambi-images"
    assert job.content_type == "image/jpeg"
    assert job.requested_at == "2026-08-10T12:00:00Z"
    assert job.bounds() == dict(TIERS)


def test_rejects_unknown_version():
    with pytest.raises(UnsupportedMessage, match="version"):
        parse_job(job_json(version=2))


def test_rejects_missing_version():
    payload = job_payload()
    del payload["version"]
    with pytest.raises(UnsupportedMessage, match="version"):
        parse_job(json.dumps(payload))


def test_rejects_malformed_json():
    with pytest.raises(UnsupportedMessage, match="valid JSON"):
        parse_job("{not json")


def test_rejects_non_object_body():
    with pytest.raises(UnsupportedMessage, match="JSON object"):
        parse_job("[1, 2, 3]")


@pytest.mark.parametrize("field", ["keyRoot", "srcKey", "bucket"])
def test_rejects_missing_required_field(field: str):
    payload = job_payload()
    del payload[field]
    with pytest.raises(UnsupportedMessage, match=field):
        parse_job(json.dumps(payload))


def test_rejects_blank_required_field():
    with pytest.raises(UnsupportedMessage, match="keyRoot"):
        parse_job(job_json(keyRoot="   "))


def test_optional_fields_default_to_empty():
    payload = job_payload()
    del payload["contentType"]
    del payload["requestedAt"]

    job = parse_job(json.dumps(payload))

    assert job.content_type == ""
    assert job.requested_at == ""


@pytest.mark.parametrize(
    "tiers",
    [
        [],
        "XS",
        [{"tier": "XS"}],
        [{"tier": "XS", "maxEdge": 0}],
        [{"tier": "XS", "maxEdge": -64}],
        [{"tier": "XS", "maxEdge": "64"}],
        [{"tier": "", "maxEdge": 64}],
        ["XS"],
    ],
)
def test_rejects_invalid_tiers(tiers: object):
    with pytest.raises(UnsupportedMessage):
        parse_job(job_json(tiers=tiers))


@pytest.mark.parametrize(
    ("tier", "expected"),
    [
        ("XS", "gallery/9f2c/xs.webp"),
        ("SM", "gallery/9f2c/sm.webp"),
        ("MD", "gallery/9f2c/md.webp"),
        ("LG", "gallery/9f2c/lg.webp"),
        ("XL", "gallery/9f2c/xl.webp"),
    ],
)
def test_variant_key_matches_the_backend_layout(tier: str, expected: str):
    """Twin of the backend's ImageKeys.variantKey assertion: {keyRoot}/{tier}.webp."""
    assert variant_key("gallery/9f2c", tier) == expected
    assert parse_job(job_json()).key_for(tier) == expected


def test_variant_key_handles_nested_key_roots():
    assert variant_key("drawing/sess-1/part-2/9f2c", "XL") == "drawing/sess-1/part-2/9f2c/xl.webp"
