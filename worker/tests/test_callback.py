"""The readiness callback: payload shape, shared-secret header, retry/give-up behaviour."""

from __future__ import annotations

from typing import Any

import pytest
import requests

from ambi_image_worker import callback as callback_module
from ambi_image_worker.callback import AUTH_HEADER, MAX_TRIES, CallbackFailed, report
from ambi_image_worker.config import WorkerConfig
from ambi_image_worker.variants import VariantResult
from conftest import CALLBACK_SECRET, CALLBACK_URL

RESULT = VariantResult("gallery/9f2c", ["XS", "SM"], terminal=False, reason=None)


class Response:
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code


class RecordingPost:
    """Stands in for requests.post, replaying a scripted sequence of outcomes."""

    def __init__(self, *outcomes: object) -> None:
        self.outcomes = list(outcomes)
        self.calls: list[dict[str, Any]] = []

    def __call__(self, url: str, **kwargs: Any) -> Response:
        self.calls.append({"url": url, **kwargs})
        outcome = self.outcomes[min(len(self.calls) - 1, len(self.outcomes) - 1)]
        if isinstance(outcome, Exception):
            raise outcome
        return Response(int(outcome))


@pytest.fixture
def sleeps() -> list[float]:
    return []


def run(monkeypatch: pytest.MonkeyPatch, cfg: WorkerConfig, post: RecordingPost, sleeps: list):
    monkeypatch.setattr(callback_module.requests, "post", post)
    report(RESULT, cfg, attempt=3, sleep=sleeps.append)


def test_posts_the_contract_payload_with_the_shared_secret(
    monkeypatch: pytest.MonkeyPatch, cfg: WorkerConfig, sleeps: list
):
    post = RecordingPost(204)

    run(monkeypatch, cfg, post, sleeps)

    assert len(post.calls) == 1
    call = post.calls[0]
    assert call["url"] == CALLBACK_URL
    assert call["headers"][AUTH_HEADER] == CALLBACK_SECRET
    assert call["json"] == {
        "keyRoot": "gallery/9f2c",
        "readyTiers": ["XS", "SM"],
        "terminal": False,
        "attempt": 3,
    }
    assert call["timeout"] > 0
    assert sleeps == []


def test_retries_a_server_error_then_succeeds(
    monkeypatch: pytest.MonkeyPatch, cfg: WorkerConfig, sleeps: list
):
    post = RecordingPost(503, 204)

    run(monkeypatch, cfg, post, sleeps)

    assert len(post.calls) == 2
    assert sleeps == [1.0]


def test_retries_a_connection_error_then_succeeds(
    monkeypatch: pytest.MonkeyPatch, cfg: WorkerConfig, sleeps: list
):
    post = RecordingPost(requests.ConnectionError("backend down"), 204)

    run(monkeypatch, cfg, post, sleeps)

    assert len(post.calls) == 2


def test_gives_up_after_three_tries(
    monkeypatch: pytest.MonkeyPatch, cfg: WorkerConfig, sleeps: list
):
    post = RecordingPost(500)

    with pytest.raises(CallbackFailed, match="HTTP 500"):
        run(monkeypatch, cfg, post, sleeps)

    assert len(post.calls) == MAX_TRIES
    assert sleeps == [1.0, 2.0]


def test_gives_up_after_three_connection_errors(
    monkeypatch: pytest.MonkeyPatch, cfg: WorkerConfig, sleeps: list
):
    post = RecordingPost(requests.ConnectionError("backend down"))

    with pytest.raises(CallbackFailed, match="backend down"):
        run(monkeypatch, cfg, post, sleeps)

    assert len(post.calls) == MAX_TRIES


def test_unauthorised_is_not_swallowed(
    monkeypatch: pytest.MonkeyPatch, cfg: WorkerConfig, sleeps: list
):
    post = RecordingPost(401)

    with pytest.raises(CallbackFailed, match="HTTP 401"):
        run(monkeypatch, cfg, post, sleeps)


def test_terminal_result_reports_an_empty_tier_list(
    monkeypatch: pytest.MonkeyPatch, cfg: WorkerConfig
):
    post = RecordingPost(204)
    monkeypatch.setattr(callback_module.requests, "post", post)

    report(VariantResult("gallery/dud", [], terminal=True, reason="undecodable"), cfg, 5)

    assert post.calls[0]["json"] == {
        "keyRoot": "gallery/dud",
        "readyTiers": [],
        "terminal": True,
        "attempt": 5,
    }
