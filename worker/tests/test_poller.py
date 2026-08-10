"""The long-poll loop: a message is deleted only once the backend has been told."""

from __future__ import annotations

from typing import Any

import pytest

from ambi_image_worker import poller
from ambi_image_worker.config import WorkerConfig
from ambi_image_worker.variants import VariantResult
from conftest import FakeObjectStore, job_json, jpeg_bytes

BUCKET = "ambi-images"
SRC_KEY = "gallery/9f2c/original"


class FakeSqs:
    """A minimal stand-in for the boto3 SQS client."""

    def __init__(self, *batches: list[dict[str, Any]]) -> None:
        self.batches = list(batches)
        self.receive_requests: list[dict[str, Any]] = []
        self.deleted: list[str] = []

    def receive_message(self, **request: Any) -> dict[str, Any]:
        self.receive_requests.append(request)
        if not self.batches:
            return {}
        return {"Messages": self.batches.pop(0)}

    def delete_message(self, **request: Any) -> None:
        self.deleted.append(request["ReceiptHandle"])


def message(body: str | None = None, receive_count: int = 1, handle: str = "rh-1") -> dict:
    return {
        "MessageId": "m-1",
        "ReceiptHandle": handle,
        "Body": job_json() if body is None else body,
        "Attributes": {"ApproximateReceiveCount": str(receive_count)},
    }


@pytest.fixture
def loaded_store(store: FakeObjectStore) -> FakeObjectStore:
    store.objects[(BUCKET, SRC_KEY)] = jpeg_bytes(400, 200)
    return store


@pytest.fixture
def reports(monkeypatch: pytest.MonkeyPatch) -> list[tuple[VariantResult, int]]:
    recorded: list[tuple[VariantResult, int]] = []
    monkeypatch.setattr(
        poller, "report", lambda result, _cfg, attempt: recorded.append((result, attempt))
    )
    return recorded


def test_deletes_the_message_after_a_successful_callback(
    loaded_store: FakeObjectStore, cfg: WorkerConfig, reports: list
):
    sqs = FakeSqs([message()])

    received = poller.run_once(sqs, loaded_store, cfg)

    assert received == 1
    assert sqs.deleted == ["rh-1"]
    assert len(reports) == 1
    assert sorted(reports[0][0].ready_tiers) == ["LG", "MD", "SM", "XL", "XS"]


def test_leaves_the_message_when_the_callback_fails(
    monkeypatch: pytest.MonkeyPatch, loaded_store: FakeObjectStore, cfg: WorkerConfig
):
    def explode(*_args: Any, **_kwargs: Any) -> None:
        raise RuntimeError("backend unreachable")

    monkeypatch.setattr(poller, "report", explode)
    sqs = FakeSqs([message()])

    poller.run_once(sqs, loaded_store, cfg)

    assert sqs.deleted == []


def test_leaves_the_message_when_storage_fails(
    loaded_store: FakeObjectStore, cfg: WorkerConfig, reports: list
):
    loaded_store.put_error = RuntimeError("bucket unreachable")
    sqs = FakeSqs([message()])

    poller.run_once(sqs, loaded_store, cfg)

    assert sqs.deleted == []
    assert reports == []


def test_leaves_an_unparseable_message_for_the_dead_letter_queue(
    loaded_store: FakeObjectStore, cfg: WorkerConfig, reports: list
):
    sqs = FakeSqs([message(body=job_json(version=99))])

    poller.run_once(sqs, loaded_store, cfg)

    assert sqs.deleted == []
    assert reports == []


def test_deletes_a_missing_source_message_so_it_stops_redelivering(
    store: FakeObjectStore, cfg: WorkerConfig, reports: list
):
    sqs = FakeSqs([message()])

    poller.run_once(sqs, store, cfg)

    assert sqs.deleted == ["rh-1"]
    assert reports[0][0].reason == "source_missing"


def test_forwards_the_sqs_receive_count_as_the_reported_attempt(
    loaded_store: FakeObjectStore, cfg: WorkerConfig, reports: list
):
    sqs = FakeSqs([message(receive_count=4)])

    poller.run_once(sqs, loaded_store, cfg)

    assert reports[0][1] == 4


def test_defaults_the_attempt_when_sqs_sends_no_attributes(
    loaded_store: FakeObjectStore, cfg: WorkerConfig, reports: list
):
    bare = message()
    del bare["Attributes"]
    sqs = FakeSqs([bare])

    poller.run_once(sqs, loaded_store, cfg)

    assert reports[0][1] == 1


def test_long_polls_the_configured_queue(
    loaded_store: FakeObjectStore, cfg: WorkerConfig, reports: list
):
    sqs = FakeSqs([])

    poller.run_once(sqs, loaded_store, cfg)

    request = sqs.receive_requests[0]
    assert request["QueueUrl"] == cfg.queue_url
    assert request["WaitTimeSeconds"] == cfg.wait_seconds
    assert request["MaxNumberOfMessages"] == cfg.max_messages
    assert request["VisibilityTimeout"] == cfg.visibility_timeout
    assert request["AttributeNames"] == ["ApproximateReceiveCount"]


def test_processes_a_whole_batch(loaded_store: FakeObjectStore, cfg: WorkerConfig, reports: list):
    sqs = FakeSqs([message(handle="rh-1"), message(handle="rh-2")])

    assert poller.run_once(sqs, loaded_store, cfg) == 2
    assert sqs.deleted == ["rh-1", "rh-2"]


def test_run_forever_backs_off_after_a_receive_error(
    monkeypatch: pytest.MonkeyPatch, loaded_store: FakeObjectStore, cfg: WorkerConfig
):
    slept: list[float] = []
    monkeypatch.setattr(poller.time, "sleep", slept.append)

    class Broken(FakeSqs):
        def receive_message(self, **request: Any) -> dict[str, Any]:
            raise RuntimeError("network down")

    remaining = [True, False]
    poller.run_forever(Broken(), loaded_store, cfg, should_continue=lambda: remaining.pop(0))

    assert slept == [poller.ERROR_BACKOFF_SECONDS]
