"""Tests for POST /train and GET /train/status (training itself is stubbed)."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app import main, trainer

TOKEN = "test-train-token-123456"


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setattr(main, "backend_setting", lambda *_: TOKEN)
    with TestClient(main.app) as test_client:
        yield test_client


def test_train_requires_token(client: TestClient) -> None:
    assert client.post("/train").status_code == 401
    assert client.post("/train", headers={"X-Train-Token": "wrong"}).status_code == 401


def test_train_skips_without_enough_new_qcare_data(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(trainer, "resolve_database_url", lambda: "postgresql://stub")
    monkeypatch.setattr(trainer, "count_qcare_records", lambda _url: 3)

    body = client.post("/train", headers={"X-Train-Token": TOKEN}).json()

    assert body["state"] == "skipped"
    assert "minimal" in body["reason"]


def test_forced_train_runs_in_background_and_reports_status(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake_metrics = {
        "model_version": "rf-v3-test",
        "promotion": {"approved": False, "reason": "stub"},
        "split": "latih sesi <= 304, uji sesi > 304",
        "sources": {"hangu": 6637, "qcare": 0},
        "wait": {"random_forest": {"mae_min": 1.0}, "baseline_historical_avg": {"mae_min": 2.0}},
    }
    monkeypatch.setattr(trainer, "train", lambda _config: fake_metrics)
    promoted: list[bool] = []
    monkeypatch.setattr(trainer, "promote", lambda: promoted.append(True))
    monkeypatch.setattr(main.trainer, "_on_promoted", lambda: None)

    started = client.post("/train", headers={"X-Train-Token": TOKEN}, json={"force": True}).json()
    main.trainer._lock.acquire()  # waits until the background thread released it
    main.trainer._lock.release()
    status = client.get("/train/status").json()

    assert started["state"] == "running"
    assert status["state"] == "succeeded"
    assert status["model_version"] == "rf-v3-test"
    assert promoted == [True]  # force installs even when the guard said no
