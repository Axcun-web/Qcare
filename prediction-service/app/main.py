"""Qcare wait-time prediction API (UC Lihat Estimasi Waktu).

Run from prediction-service/:
    .venv/Scripts/python -m uvicorn app.main:app --port 8000
"""

import hmac
import logging
import pickle
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.predictor import Predictor
from app.trainer import TrainingManager
from training.dataset import backend_setting

MAX_BATCH_SIZE = 200
LOAD_ERRORS = (OSError, KeyError, ValueError, AttributeError, ImportError, pickle.UnpicklingError)

log = logging.getLogger("qcare.prediction")
_state: dict[str, Predictor] = {}


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Loads the model once at startup.

    A load failure keeps the API up in a degraded state so the backend sees
    ``loaded: false`` on /health and uses its historical-average fallback.
    """
    try:
        _load_predictor()
    except LOAD_ERRORS:
        log.exception("Failed to load model")
    yield
    _state.clear()


app = FastAPI(title="Qcare Prediction Service", lifespan=lifespan)


def _load_predictor() -> None:
    """(Re)load the model from disk; called at startup and after each promotion."""
    # [Alur 12] Hot-swap: request berikutnya langsung memakai model baru.
    _state["predictor"] = Predictor()


def _model_qcare_records() -> int:
    """Qcare rows the current model was trained on (0 for a Hangu-only model)."""
    predictor = _state.get("predictor")
    return int(predictor.spec.get("sources", {}).get("qcare", 0)) if predictor else 0


trainer = TrainingManager(last_qcare_records=_model_qcare_records, on_promoted=_load_predictor)


class PredictInput(BaseModel):
    """One queue snapshot for a single patient."""

    queue_position: int = Field(ge=1)
    patients_ahead: int = Field(ge=0, description="Termasuk pasien yang sedang dilayani")
    day_of_week: int = Field(ge=0, le=6, description="Senin=0 ... Minggu=6")
    hour: int = Field(ge=0, le=23, description="Jam saat prediksi dibuat")
    doctor_avg_service_min: float = Field(gt=0)


class PredictOutput(BaseModel):
    """Estimated minutes for one patient."""

    estimated_wait_min: float
    estimated_service_min: float
    model_version: str
    out_of_distribution: bool


class BatchInput(BaseModel):
    """Several snapshots, e.g. every waiting patient of one doctor session."""

    items: list[PredictInput] = Field(min_length=1, max_length=MAX_BATCH_SIZE)


def _run(items: list[PredictInput]) -> list[dict[str, Any]]:
    """Runs the model and logs out-of-distribution inputs.

    Raises:
        HTTPException: 503 when the model is not loaded.
    """
    predictor = _state.get("predictor")
    if predictor is None:
        raise HTTPException(status_code=503, detail="Model belum dimuat")
    results = predictor.predict([item.model_dump() for item in items])
    for item, result in zip(items, results):
        if result["out_of_distribution"]:
            log.warning("Out-of-distribution input: %s", item.model_dump())
    return results


@app.get("/health")
def health() -> dict[str, Any]:
    """Reports whether the model is loaded and which version is served."""
    predictor = _state.get("predictor")
    if predictor is None:
        return {"status": "degraded", "loaded": False, "model_version": None}
    return {
        "status": "ok",
        "loaded": True,
        "model_version": predictor.version,
        "cold_start_avg_service_min": predictor.spec["cold_start_avg_service_min"],
    }


@app.post("/predict", response_model=PredictOutput)
def predict(body: PredictInput) -> dict[str, Any]:
    """Predicts wait and service minutes for one patient."""
    return _run([body])[0]


@app.post("/predict/batch", response_model=list[PredictOutput])
def predict_batch(body: BatchInput) -> list[dict[str, Any]]:
    """Predicts for several patients in one call, preserving order."""
    return _run(body.items)


class TrainInput(BaseModel):
    """Options for POST /train."""

    force: bool = Field(
        default=False,
        description="Train even without enough new Qcare data, and install even if worse",
    )


def _require_train_token(token: str | None) -> None:
    """Training is CPU-heavy: only the Express backend (shared secret) may start it.

    Raises:
        HTTPException: 503 if no token is configured, 401 if it doesn't match.
    """
    expected = backend_setting("TRAIN_TOKEN", "PREDICTION_TRAIN_TOKEN")
    if not expected:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "PREDICTION_TRAIN_TOKEN belum diatur")
    if not token or not hmac.compare_digest(token, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token pelatihan tidak valid")


@app.post("/train", status_code=status.HTTP_202_ACCEPTED)
def start_training(
    body: TrainInput | None = None,
    x_train_token: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """Reload the dataset (Hangu + Qcare) and retrain in the background.

    Returns immediately; poll GET /train/status for the result. The new model
    replaces the running one without a restart if it passes the promotion check.
    """
    _require_train_token(x_train_token)
    return trainer.request(force=body.force if body else False)


@app.get("/train/status")
def training_status() -> dict[str, Any]:
    """Last training run: state, version, split, sources, MAE and promotion decision."""
    predictor = _state.get("predictor")
    return {**trainer.status, "serving_model_version": predictor.version if predictor else None}
