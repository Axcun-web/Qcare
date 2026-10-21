"""Loads the trained bundle and turns queue snapshots into minute estimates.

Both models predict a RATIO to ``doctor_avg_service_min`` (see
training/README.md). That average is a multiplier only, not a model
feature, so each output is multiplied by the doctor's real (unclamped)
long-term average. Feature columns are clamped to the ranges seen in
training.
"""

import json
import os
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

DEFAULT_MODEL_DIR = Path(__file__).resolve().parent.parent / "model"
MODEL_DIR = Path(os.getenv("MODEL_DIR", str(DEFAULT_MODEL_DIR)))
DAYS_SEEN_KEY = "day_of_week_seen"


class Predictor:
    """Wraps the wait-time and service-time Random Forest models.

    Attributes:
        spec: Parsed ``feature_spec.json``.
        version: Model version string from the bundle.
    """

    def __init__(self, model_dir: Path = MODEL_DIR) -> None:
        """Loads ``model.joblib`` and ``feature_spec.json`` from ``model_dir``.

        Args:
            model_dir: Directory holding the training artifacts.
        """
        bundle = joblib.load(model_dir / "model.joblib")
        self.spec: dict[str, Any] = json.loads(
            (model_dir / "feature_spec.json").read_text(encoding="utf-8")
        )
        self._wait_model = bundle["wait"]
        self._service_model = bundle["service"]
        self._wait_features: list[str] = bundle["wait_features"]
        self._service_features: list[str] = bundle["service_features"]
        self.version: str = bundle["version"]
        ranges = self.spec["valid_ranges"]
        self._days_seen = set(ranges[DAYS_SEEN_KEY])
        self._ranges = {k: v for k, v in ranges.items() if k != DAYS_SEEN_KEY}

    def _features(
        self, rows: list[dict[str, Any]], features: list[str]
    ) -> tuple[pd.DataFrame, list[bool]]:
        """Builds one model's clamped feature frame plus a per-row OOD flag.

        Only the model's own feature columns are range-checked, so e.g.
        ``patients_ahead`` never flags the service model.
        """
        frame = pd.DataFrame(rows, columns=features)
        ood = ~frame["day_of_week"].isin(self._days_seen)
        for col in features:
            if col not in self._ranges:
                continue
            low, high = self._ranges[col]
            ood |= (frame[col] < low) | (frame[col] > high)
            frame[col] = frame[col].clip(low, high)
        return frame, ood.tolist()

    def predict(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Predicts wait and service minutes for each queue snapshot.

        Args:
            rows: Dicts with ``queue_position``, ``patients_ahead``,
                ``day_of_week``, ``hour`` and ``doctor_avg_service_min``.

        Returns:
            One dict per row with ``estimated_wait_min``,
            ``estimated_service_min``, ``model_version`` and
            ``out_of_distribution``.
        """
        service_frame, ood = self._features(rows, self._service_features)
        service_ratio = self._service_model.predict(service_frame)

        # patients_ahead == 0 (next up / being served) was never in training
        # data, so those rows skip the wait model and get a 0-minute wait.
        wait_ratio = [0.0] * len(rows)
        model_idx = [i for i, row in enumerate(rows) if row["patients_ahead"] > 0]
        if model_idx:
            wait_frame, wait_ood = self._features(
                [rows[i] for i in model_idx], self._wait_features
            )
            predicted = self._wait_model.predict(wait_frame)
            for j, i in enumerate(model_idx):
                wait_ratio[i] = float(predicted[j])
                ood[i] = ood[i] or wait_ood[j]

        return [
            {
                "estimated_wait_min": round(max(0.0, wait_ratio[i] * row["doctor_avg_service_min"]), 2),
                "estimated_service_min": round(
                    max(0.0, float(service_ratio[i]) * row["doctor_avg_service_min"]), 2
                ),
                "model_version": self.version,
                "out_of_distribution": bool(ood[i]),
            }
            for i, row in enumerate(rows)
        ]
