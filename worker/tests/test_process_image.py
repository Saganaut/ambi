"""The shared core: what lands in storage and what gets reported for each outcome."""

from __future__ import annotations

import pytest

from ambi_image_worker.config import WorkerConfig
from ambi_image_worker.messages import parse_job
from ambi_image_worker.variants import (
    REASON_SOURCE_MISSING,
    REASON_UNDECODABLE,
    WEBP_CONTENT_TYPE,
    process_image,
)
from conftest import FakeObjectStore, job_json, jpeg_bytes

BUCKET = "ambi-images"
SRC_KEY = "gallery/9f2c/original"
EXPECTED_KEYS = {
    "gallery/9f2c/xs.webp",
    "gallery/9f2c/sm.webp",
    "gallery/9f2c/md.webp",
    "gallery/9f2c/lg.webp",
    "gallery/9f2c/xl.webp",
}


def test_stores_every_tier_under_the_derived_key(store: FakeObjectStore, cfg: WorkerConfig):
    store.objects[(BUCKET, SRC_KEY)] = jpeg_bytes(1000, 500)

    result = process_image(parse_job(job_json()), store, cfg)

    assert store.keys(BUCKET) - {SRC_KEY} == EXPECTED_KEYS
    assert sorted(result.ready_tiers) == ["LG", "MD", "SM", "XL", "XS"]
    assert result.terminal is True
    assert result.reason is None


def test_variants_are_webp_content_type(store: FakeObjectStore, cfg: WorkerConfig):
    store.objects[(BUCKET, SRC_KEY)] = jpeg_bytes(400, 400)

    process_image(parse_job(job_json()), store, cfg)

    assert set(store.content_types.values()) == {WEBP_CONTENT_TYPE}


def test_every_reported_tier_was_put_first(store: FakeObjectStore, cfg: WorkerConfig):
    """The ordering invariant: an object exists before its tier is ever reported ready."""
    store.objects[(BUCKET, SRC_KEY)] = jpeg_bytes(1000, 500)
    job = parse_job(job_json())

    result = process_image(job, store, cfg)

    for tier in result.ready_tiers:
        assert (BUCKET, job.key_for(tier)) in store.objects


def test_missing_source_reports_zero_tiers_and_is_not_terminal(
    store: FakeObjectStore, cfg: WorkerConfig
):
    result = process_image(parse_job(job_json()), store, cfg)

    assert result.ready_tiers == []
    assert result.terminal is False
    assert result.reason == REASON_SOURCE_MISSING
    assert store.puts == []


def test_undecodable_source_is_terminal_with_no_tiers(store: FakeObjectStore, cfg: WorkerConfig):
    store.objects[(BUCKET, SRC_KEY)] = b"this is not an image"

    result = process_image(parse_job(job_json()), store, cfg)

    assert result.ready_tiers == []
    assert result.terminal is True
    assert result.reason == REASON_UNDECODABLE
    assert store.puts == []


def test_storage_failure_propagates_so_the_message_is_redelivered(
    store: FakeObjectStore, cfg: WorkerConfig
):
    store.objects[(BUCKET, SRC_KEY)] = jpeg_bytes(400, 400)
    store.put_error = RuntimeError("bucket unreachable")

    with pytest.raises(RuntimeError, match="bucket unreachable"):
        process_image(parse_job(job_json()), store, cfg)


def test_only_the_requested_tiers_are_rendered(store: FakeObjectStore, cfg: WorkerConfig):
    store.objects[(BUCKET, SRC_KEY)] = jpeg_bytes(400, 400)
    job = parse_job(job_json(tiers=[{"tier": "XS", "maxEdge": 64}]))

    result = process_image(job, store, cfg)

    assert result.ready_tiers == ["XS"]
    assert store.keys(BUCKET) - {SRC_KEY} == {"gallery/9f2c/xs.webp"}
