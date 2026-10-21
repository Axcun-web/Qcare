"""Integration tests for the prediction API against the real model bundle."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    """Starts the app once (the model load takes a moment)."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def snapshot() -> dict:
    """A typical in-distribution queue snapshot (Wednesday 09:00)."""
    return {
        "queue_position": 5,
        "patients_ahead": 4,
        "day_of_week": 2,
        "hour": 9,
        "doctor_avg_service_min": 13.451,
    }


def test_health_reports_loaded_model(client: TestClient) -> None:
    body = client.get("/health").json()

    assert body["loaded"] is True
    assert body["model_version"]


def test_predict_returns_positive_minutes(client: TestClient, snapshot: dict) -> None:
    body = client.post("/predict", json=snapshot).json()

    assert body["estimated_wait_min"] > 0
    assert body["estimated_service_min"] > 0
    assert body["out_of_distribution"] is False


def test_zero_patients_ahead_means_zero_wait(client: TestClient, snapshot: dict) -> None:
    body = client.post("/predict", json={**snapshot, "patients_ahead": 0}).json()

    assert body["estimated_wait_min"] == 0
    assert body["out_of_distribution"] is False


def test_faster_doctor_gets_shorter_wait(client: TestClient, snapshot: dict) -> None:
    slow = client.post("/predict", json=snapshot).json()
    fast = client.post("/predict", json={**snapshot, "doctor_avg_service_min": 9.0}).json()

    assert fast["estimated_wait_min"] < slow["estimated_wait_min"]


def test_patient_further_back_never_waits_less(client: TestClient, snapshot: dict) -> None:
    items = [
        {**snapshot, "queue_position": ahead + 1, "patients_ahead": ahead} for ahead in range(1, 16)
    ]

    waits = [r["estimated_wait_min"] for r in client.post("/predict/batch", json={"items": items}).json()]

    assert waits == sorted(waits)


def test_unseen_day_is_flagged_but_still_predicted(client: TestClient, snapshot: dict) -> None:
    body = client.post("/predict", json={**snapshot, "day_of_week": 0}).json()

    assert body["out_of_distribution"] is True
    assert body["estimated_wait_min"] > 0


def test_batch_matches_single(client: TestClient, snapshot: dict) -> None:
    single = client.post("/predict", json=snapshot).json()
    batch = client.post(
        "/predict/batch", json={"items": [snapshot, {**snapshot, "patients_ahead": 0}]}
    ).json()

    assert batch[0] == single
    assert batch[1]["estimated_wait_min"] == 0


def test_invalid_day_rejected(client: TestClient, snapshot: dict) -> None:
    response = client.post("/predict", json={**snapshot, "day_of_week": 9})

    assert response.status_code == 422
