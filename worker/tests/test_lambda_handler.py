"""The Lambda entry point drives the same core and reports partial batch failures."""

from __future__ import annotations

from typing import Any

import pytest

from ambi_image_worker import lambda_handler
from ambi_image_worker.config import WorkerConfig
from ambi_image_worker.variants import VariantResult
from conftest import FakeObjectStore, job_json, jpeg_bytes

BUCKET = "ambi-images"
SRC_KEY = "gallery/9f2c/original"


def record(message_id: str, body: str | None = None, receive_count: int = 1) -> dict[str, Any]:
    return {
        "messageId": message_id,
        "body": job_json() if body is None else body,
        "attributes": {"ApproximateReceiveCount": str(receive_count)},
    }


@pytest.fixture
def runtime(
    monkeypatch: pytest.MonkeyPatch, store: FakeObjectStore, cfg: WorkerConfig
) -> FakeObjectStore:
    store.objects[(BUCKET, SRC_KEY)] = jpeg_bytes(400, 200)
    monkeypatch.setattr(lambda_handler, "runtime", lambda: (cfg, store))
    return store


@pytest.fixture
def reports(monkeypatch: pytest.MonkeyPatch) -> list[tuple[VariantResult, int]]:
    recorded: list[tuple[VariantResult, int]] = []
    monkeypatch.setattr(
        lambda_handler, "report", lambda result, _cfg, attempt: recorded.append((result, attempt))
    )
    return recorded


def test_empty_event_reports_no_failures(runtime: FakeObjectStore, reports: list):
    assert lambda_handler.handler({"Records": []}) == {"batchItemFailures": []}
    assert reports == []


def test_processes_every_record(runtime: FakeObjectStore, reports: list):
    event = {"Records": [record("m-1"), record("m-2")]}

    assert lambda_handler.handler(event) == {"batchItemFailures": []}
    assert len(reports) == 2
    assert sorted(reports[0][0].ready_tiers) == ["LG", "MD", "SM", "XL", "XS"]


def test_only_the_failing_record_is_returned_as_a_batch_item_failure(
    runtime: FakeObjectStore, reports: list
):
    event = {"Records": [record("m-good"), record("m-bad", body="{not json"), record("m-also")]}

    response = lambda_handler.handler(event)

    assert response == {"batchItemFailures": [{"itemIdentifier": "m-bad"}]}
    assert len(reports) == 2


def test_a_failed_callback_fails_only_its_own_record(
    monkeypatch: pytest.MonkeyPatch, runtime: FakeObjectStore, cfg: WorkerConfig
):
    seen: list[str] = []

    def flaky(result: VariantResult, _cfg: WorkerConfig, attempt: int) -> None:
        seen.append(result.key_root)
        if attempt == 2:
            raise RuntimeError("backend unreachable")

    monkeypatch.setattr(lambda_handler, "report", flaky)
    event = {"Records": [record("m-1"), record("m-2", receive_count=2)]}

    response = lambda_handler.handler(event)

    assert response == {"batchItemFailures": [{"itemIdentifier": "m-2"}]}
    assert len(seen) == 2


def test_forwards_the_sqs_receive_count_as_the_reported_attempt(
    runtime: FakeObjectStore, reports: list
):
    lambda_handler.handler({"Records": [record("m-1", receive_count=3)]})

    assert reports[0][1] == 3


def test_defaults_the_attempt_when_the_record_has_no_attributes(
    runtime: FakeObjectStore, reports: list
):
    bare = record("m-1")
    del bare["attributes"]

    lambda_handler.handler({"Records": [bare]})

    assert reports[0][1] == 1
