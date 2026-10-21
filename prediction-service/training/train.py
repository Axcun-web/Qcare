"""Latih model prediksi Qcare (Random Forest) dari data yang dimuat secara dinamis.

Sumber data (lihat ``dataset.py``): Hangu (Feng et al., 2023, Data 8(3), 47)
sebagai pra-pelatihan, ditambah antrean SELESAI Qcare dari PostgreSQL bila ada.

Menghasilkan dua model dalam satu bundel ``../model/model.joblib``:

* ``wait``    -> estimasi waktu tunggu (menit) hingga giliran pasien dimulai.
* ``service`` -> estimasi durasi pelayanan satu pasien (menit).

Kedua model memprediksi RASIO terhadap ``doctor_avg_service_min`` (rata-rata
jangka panjang dokter), lalu dikalikan kembali. Rata-rata dokter hanya dipakai
sebagai PENGALI, bukan fitur: dataset Hangu berisi satu dokter, sehingga variasi
rata-rata jangka pendek di dalamnya hanyalah noise dan model belajar mengabaikan
atau bahkan membalik efek kecepatan dokter.

Alur (juga dipanggil oleh ``POST /train`` di layanan FastAPI):

1. Muat data (Hangu + Qcare) dan urutkan sesi secara kronologis.
2. Bagi 80/20 per sesi: ``TEST_FRACTION`` sesi TERAKHIR menjadi data uji;
   cutoff dihitung dari data, mis. 381 sesi Hangu -> latih <= 304, uji > 304.
3. Tuning (GridSearchCV + GroupKFold per sesi) pada data latih, evaluasi pada
   data uji: MAE/RMSE vs baseline rata-rata historis, per sumber data.
4. Model yang DIPASANG dilatih ulang dengan parameter terbaik pada SELURUH data,
   agar sesi Qcare terbaru ikut dipelajari.
5. Artefak ditulis ke folder staging; ``promote`` memindahkannya ke ``../model``.

Jalankan dari folder ``prediction-service``::

    .venv/Scripts/python training/train.py              # Hangu + Qcare
    .venv/Scripts/python training/train.py --no-qcare   # Hangu saja (= model v2)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

try:  # dipakai sebagai paket oleh layanan FastAPI (prediction-service/ di sys.path)
    from training.dataset import DEFAULT_HANGU_PATH, load_dataset, resolve_database_url
except ModuleNotFoundError:  # dijalankan langsung: py training/train.py
    from dataset import DEFAULT_HANGU_PATH, load_dataset, resolve_database_url

log = logging.getLogger("train")

HERE = Path(__file__).resolve().parent
MODEL_DIR = HERE.parent / "model"
STAGING_DIR = MODEL_DIR / ".staging"
ARTIFACTS = ("model.joblib", "feature_spec.json", "metrics.json")

RANDOM_STATE = 42
TEST_FRACTION = 0.2  # 20% sesi terakhir (kronologis) sebagai test set
BOOTSTRAP_ROUNDS = 1000
# Di bawah ini data uji Qcare dianggap terlalu sedikit untuk menolak model baru.
MIN_QCARE_TEST_PAIRS = 30

WAIT_FEATURES = [
    "queue_position",
    "patients_ahead",
    "day_of_week",
    "hour",
]
SERVICE_FEATURES = ["queue_position", "day_of_week", "hour"]
MONOTONIC_INCREASING = {"patients_ahead", "queue_position"}

PARAM_GRID = {"rf__min_samples_leaf": [20, 50, 100], "rf__max_features": [0.6, 1.0]}
WAIT_BUCKETS = [(1, 3), (4, 8), (9, 15), (16, 40)]


@dataclass
class Split:
    """Pasangan data latih/uji."""

    train: pd.DataFrame
    test: pd.DataFrame


@dataclass
class TrainConfig:
    """Parameter satu kali pelatihan.

    Attributes:
        hangu_path: Lokasi Data.csv Hangu (diunduh otomatis bila belum ada).
        database_url: URL PostgreSQL Qcare; None = Hangu saja.
        test_fraction: Porsi sesi terakhir untuk data uji.
        out_dir: Folder tujuan artefak (staging).
        incumbent_path: model.joblib yang sedang dipakai, untuk pembanding.
    """

    hangu_path: Path = DEFAULT_HANGU_PATH
    database_url: str | None = None
    test_fraction: float = TEST_FRACTION
    out_dir: Path = STAGING_DIR
    incumbent_path: Path | None = field(default_factory=lambda: MODEL_DIR / "model.joblib")


def build_wait_pairs(consults: pd.DataFrame) -> pd.DataFrame:
    """Bentuk sampel waktu tunggu dari setiap pasangan (j, k) dalam satu sesi.

    Titik waktu "sekarang" adalah saat pasien j mulai dilayani. Untuk pasien k
    (k > j) waktu tunggunya = start_k - start_j, dengan ``patients_ahead`` =
    k - j (termasuk pasien yang sedang dilayani). j = pasien pertama mewakili
    estimasi saat pendaftaran sebelum praktik dimulai. Urutan j/k adalah urutan
    DILAYANI (waktu mulai), sama seperti Hangu, sehingga pasien yang dilewati
    tidak menghasilkan waktu tunggu negatif.

    Args:
        consults: Output ``dataset.load_dataset``.

    Returns:
        DataFrame berisi ``WAIT_FEATURES``, ``wait_min``, ``wait_ratio``,
        ``doctor_avg_service_min``, ``session``, ``session_order``, ``source``.
    """
    frames = []
    for _, sess in consults.groupby("session_order", sort=True):
        s = sess.reset_index(drop=True)
        j_idx, k_idx = np.triu_indices(len(s), k=1)
        now, target = s.iloc[j_idx].reset_index(drop=True), s.iloc[k_idx].reset_index(drop=True)
        frames.append(
            pd.DataFrame(
                {
                    "session": target["session"],
                    "session_order": target["session_order"],
                    "source": target["source"],
                    "queue_position": target["queue_position"],
                    "patients_ahead": k_idx - j_idx,
                    "day_of_week": target["day_of_week"],
                    "hour": now["hour"],
                    "doctor_avg_service_min": now["doctor_avg_service_min"],
                    "wait_min": target["start_min"] - now["start_min"],
                }
            )
        )
    pairs = pd.concat(frames, ignore_index=True)
    pairs["wait_ratio"] = pairs["wait_min"] / pairs["doctor_avg_service_min"]
    return pairs


def compute_cutoff(consults: pd.DataFrame, test_fraction: float) -> int:
    """Nomor urut sesi terakhir yang masuk data latih (dihitung, bukan ditulis manual).

    Args:
        consults: Data dengan kolom ``session_order``.
        test_fraction: Porsi sesi terakhir untuk data uji, mis. 0.2.

    Returns:
        Cutoff, mis. 304 untuk 381 sesi Hangu (381 x 0.8 = 304.8 -> 304).
    """
    sessions = np.sort(consults["session_order"].unique())
    return int(sessions[int(len(sessions) * (1 - test_fraction)) - 1])


def chronological_split(df: pd.DataFrame, cutoff: int) -> Split:
    """Sesi dengan ``session_order <= cutoff`` untuk latih, sisanya uji."""
    is_train = df["session_order"] <= cutoff
    return Split(train=df[is_train], test=df[~is_train])


def make_pipeline(monotonic: list[int] | None = None) -> Pipeline:
    """Normalisasi fitur (StandardScaler) lalu Random Forest.

    Scaler disimpan di dalam pipeline sehingga layanan FastAPI cukup memanggil
    ``predict`` dengan fitur mentah. Catatan: Random Forest invarian terhadap
    penskalaan monoton, jadi scaler tidak mengubah hasil; ia dipakai agar tahap
    normalisasi pada Bab 3 terimplementasi secara eksplisit.

    Args:
        monotonic: ``monotonic_cst`` per fitur (1 = naik, 0 = bebas), atau None.
    """
    return Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "rf",
                RandomForestRegressor(
                    n_estimators=200,
                    random_state=RANDOM_STATE,
                    n_jobs=-1,
                    monotonic_cst=monotonic,
                ),
            ),
        ]
    )


def _monotonic(features: list[str]) -> list[int] | None:
    """Antrean lebih panjang / posisi lebih belakang tidak boleh memperpendek estimasi."""
    if "patients_ahead" not in features:  # hanya model waktu tunggu
        return None
    return [1 if f in MONOTONIC_INCREASING else 0 for f in features]


def fit_forest(train: pd.DataFrame, features: list[str], target: str) -> GridSearchCV:
    """Tuning kecil via GroupKFold per sesi pada data latih.

    Returns:
        GridSearchCV yang sudah di-fit; ``best_estimator_`` dilatih pada data latih.
    """
    search = GridSearchCV(
        make_pipeline(_monotonic(features)),
        PARAM_GRID,
        cv=GroupKFold(n_splits=5),
        scoring="neg_mean_absolute_error",
        n_jobs=1,
    )
    search.fit(train[features], train[target], groups=train["session"])
    log.info("  %s best params: %s (CV MAE rasio %.3f)", target, search.best_params_, -search.best_score_)
    return search


def refit_all(search: GridSearchCV, data: pd.DataFrame, features: list[str], target: str) -> Pipeline:
    """Latih ulang parameter terbaik pada SELURUH data untuk model yang dipasang."""
    model = make_pipeline(_monotonic(features)).set_params(**search.best_params_)
    return model.fit(data[features], data[target])


def score(y_true: pd.Series, y_pred: np.ndarray) -> dict[str, float]:
    """Hitung MAE, RMSE (menit) dan R^2."""
    return {
        "mae_min": round(float(mean_absolute_error(y_true, y_pred)), 3),
        "rmse_min": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 3),
        "r2": round(float(r2_score(y_true, y_pred)), 3) if len(y_true) > 1 else None,
    }


def bootstrap_improvement_ci(test: pd.DataFrame, rf: np.ndarray, baseline: np.ndarray) -> list[float]:
    """CI 95% selisih MAE (baseline - RF) dengan bootstrap per SESI.

    Sesi (bukan baris) yang di-resample, karena pasangan dalam satu sesi saling
    berkorelasi. Nilai positif = RF lebih baik dari baseline.
    """
    err = pd.DataFrame(
        {
            "session": test["session"].to_numpy(),
            "rf": np.abs(test["wait_min"].to_numpy() - rf),
            "base": np.abs(test["wait_min"].to_numpy() - baseline),
        }
    )
    per_session = err.groupby("session").agg(rf=("rf", "sum"), base=("base", "sum"), n=("rf", "size"))
    rng = np.random.default_rng(RANDOM_STATE)
    idx = rng.integers(0, len(per_session), size=(BOOTSTRAP_ROUNDS, len(per_session)))
    rf_sum, base_sum, n = (per_session[c].to_numpy()[idx].sum(axis=1) for c in ("rf", "base", "n"))
    diffs = (base_sum - rf_sum) / n
    return [round(float(np.percentile(diffs, 2.5)), 2), round(float(np.percentile(diffs, 97.5)), 2)]


def _wait_report(test: pd.DataFrame, rf: np.ndarray) -> dict[str, Any]:
    """Metrik waktu tunggu untuk satu subset data uji."""
    baseline = (test["patients_ahead"] * test["doctor_avg_service_min"]).to_numpy()
    by_ahead = {}
    for lo, hi in WAIT_BUCKETS:
        m = test["patients_ahead"].between(lo, hi).to_numpy()
        if m.any():
            by_ahead[f"{lo}-{hi}"] = {
                "n": int(m.sum()),
                "rf_mae_min": round(float(mean_absolute_error(test["wait_min"][m], rf[m])), 2),
                "baseline_mae_min": round(float(mean_absolute_error(test["wait_min"][m], baseline[m])), 2),
            }
    return {
        "n_test": len(test),
        "n_sessions": int(test["session"].nunique()),
        "random_forest": score(test["wait_min"], rf),
        "baseline_historical_avg": score(test["wait_min"], baseline),
        "mae_improvement_ci95_min": bootstrap_improvement_ci(test, rf, baseline),
        "mae_by_patients_ahead": by_ahead,
    }


def predict_wait_min(model: Pipeline, data: pd.DataFrame) -> np.ndarray:
    """Prediksi menit = rasio x rata-rata dokter."""
    return model.predict(data[WAIT_FEATURES]) * data["doctor_avg_service_min"].to_numpy()


def evaluate_wait(model: Pipeline, test: pd.DataFrame) -> dict[str, Any]:
    """Bandingkan RF dengan baseline ``patients_ahead x rata-rata historis``, per sumber.

    Baseline ini identik dengan estimasi fallback Qcare (UC Lihat Estimasi
    Waktu, exception 1 & 2). Kunci level atas (= semua sumber) sama dengan
    model v2 agar angka di skripsi tetap dapat dibandingkan.
    """
    rf = predict_wait_min(model, test)
    report = _wait_report(test, rf)
    report["by_source"] = {
        src: _wait_report(test[m], rf[m.to_numpy()])
        for src in sorted(test["source"].unique())
        if (m := test["source"] == src).sum() > 0
    }
    return report


def evaluate_service(model: Pipeline, test: pd.DataFrame) -> dict[str, Any]:
    """Bandingkan RF durasi pelayanan dengan baseline rata-rata historis dokter, per sumber."""

    def report(sub: pd.DataFrame) -> dict[str, Any]:
        pred = model.predict(sub[SERVICE_FEATURES]) * sub["doctor_avg_service_min"].to_numpy()
        return {
            "n_test": len(sub),
            "random_forest": score(sub["service_min"], pred),
            "baseline_historical_avg": score(sub["service_min"], sub["doctor_avg_service_min"]),
        }

    result = report(test)
    result["by_source"] = {src: report(test[test["source"] == src]) for src in sorted(test["source"].unique())}
    return result


def evaluate_incumbent(path: Path | None, wait_test: pd.DataFrame) -> dict[str, Any] | None:
    """MAE model yang sedang dipakai pada data uji Qcare yang SAMA dengan model baru.

    Returns:
        ``{"version", "qcare_mae_min"}`` atau None bila tidak ada pembanding.
    """
    qcare_test = wait_test[wait_test["source"] == "qcare"]
    if path is None or not path.exists() or qcare_test.empty:
        return None
    bundle = joblib.load(path)
    pred = bundle["wait"].predict(qcare_test[bundle["wait_features"]]) * qcare_test[
        "doctor_avg_service_min"
    ].to_numpy()
    return {
        "version": bundle["version"],
        "qcare_mae_min": round(float(mean_absolute_error(qcare_test["wait_min"], pred)), 3),
    }


def promotion_decision(metrics: dict[str, Any]) -> tuple[bool, str]:
    """Putuskan apakah model baru boleh menggantikan model yang sedang dipakai.

    Model baru ditolak hanya bila data uji Qcare cukup (>= MIN_QCARE_TEST_PAIRS)
    dan MAE Qcare-nya lebih buruk daripada model lama pada data uji yang sama.
    """
    incumbent = metrics.get("incumbent")
    qcare = metrics["wait"]["by_source"].get("qcare")
    if incumbent is None or qcare is None:
        return True, "tidak ada pembanding data uji Qcare"
    if qcare["n_test"] < MIN_QCARE_TEST_PAIRS:
        return True, f"data uji Qcare baru {qcare['n_test']} pasangan (< {MIN_QCARE_TEST_PAIRS}), belum bisa dinilai"
    new_mae = qcare["random_forest"]["mae_min"]
    if new_mae <= incumbent["qcare_mae_min"]:
        return True, f"MAE Qcare {new_mae} <= model lama {incumbent['qcare_mae_min']}"
    return False, f"MAE Qcare {new_mae} lebih buruk dari model lama {incumbent['qcare_mae_min']}"


def importances(model: Pipeline, features: list[str]) -> dict[str, float]:
    """Kembalikan feature importance (impurity-based) yang terurut."""
    pairs = sorted(zip(features, model.named_steps["rf"].feature_importances_), key=lambda p: -p[1])
    return {name: round(float(v), 3) for name, v in pairs}


def feature_spec(
    consults: pd.DataFrame, cold_start: float, version: str, sources: dict[str, int]
) -> dict[str, Any]:
    """Susun kontrak input/output untuk layanan FastAPI."""
    seen_days = sorted(int(d) for d in consults["day_of_week"].unique())
    return {
        "model_version": version,
        "artifact": "model.joblib (dict of sklearn Pipeline[StandardScaler, RandomForestRegressor]: "
        "wait, service; plus wait_features, service_features, target, version)",
        "target": "ratio_to_doctor_avg_service_min -> kalikan prediksi dengan doctor_avg_service_min",
        "input": {
            "queue_position": "int >= 1, nomor urut pasien pada sesi/hari itu",
            "patients_ahead": "int >= 1, jumlah pasien yang dilayani sebelum pasien ini "
            "(termasuk yang sedang dilayani)",
            "day_of_week": "int 0-6, Senin=0 ... Minggu=6",
            "hour": "int 0-23, jam WIB SAAT prediksi dibuat",
            "doctor_avg_service_min": "float, rata-rata SELURUH durasi pelayanan dokter di "
            "ServiceHistory (menit). Hanya dipakai sebagai pengali, bukan fitur model.",
        },
        "output": {
            "estimated_wait_min": "float = wait.predict(X[wait_features]) * doctor_avg_service_min",
            "estimated_service_min": "float = service.predict(X[service_features]) * doctor_avg_service_min",
            "model_version": "str",
        },
        "wait_features": WAIT_FEATURES,
        "service_features": SERVICE_FEATURES,
        "cold_start_avg_service_min": round(cold_start, 3),
        "fallback_formula": "estimated_wait_min = patients_ahead * doctor_avg_service_min",
        "valid_ranges": {
            "queue_position": [1, int(consults["queue_position"].max())],
            "patients_ahead": [1, int(consults["queue_position"].max()) - 1],
            "hour": [int(consults["hour"].min()), int(consults["hour"].max())],
            "day_of_week_seen": seen_days,
        },
        "out_of_range_note": "Nilai di luar valid_ranges tidak pernah dilihat model; clamp kolom fitur "
        "ke valid_ranges dan tandai out-of-distribution di log. doctor_avg_service_min TIDAK di-clamp "
        "(hanya pengali) agar dokter yang lebih cepat/lambat tetap tercermin.",
        # Dibaca POST /train untuk memutuskan apakah ada cukup data Qcare baru.
        "sources": sources,
        "dataset": "Feng et al. (2023), Data 8(3), 47, doi:10.3390/data8030047; "
        "data doi:10.5281/zenodo.7476233; CC BY-NC-SA 4.0. Ditambah antrean SELESAI Qcare.",
    }


def train(config: TrainConfig) -> dict[str, Any]:
    """Jalankan seluruh alur pelatihan dan tulis artefak ke ``config.out_dir``.

    Returns:
        Isi metrics.json (termasuk ``promotion`` = keputusan pemasangan).
    """
    version = f"rf-v3-{datetime.now():%Y%m%d-%H%M%S}"
    # [Alur 5] Muat data dinamis: Hangu (SHA-256) + Selesai Qcare, urut kronologis.
    consults, sources = load_dataset(config.hangu_path, config.database_url)
    cutoff = compute_cutoff(consults, config.test_fraction)
    n_sessions = int(consults["session_order"].nunique())
    log.info("Konsultasi: %d (%s), sesi: %d, cutoff sesi latih: <= %d", len(consults), sources, n_sessions, cutoff)

    # [Alur 6] Rekayasa fitur dan pembentukan pasangan sampel waktu tunggu (j, k).
    pairs = build_wait_pairs(consults)
    # [Alur 7] Pembagian data per sesi: 80% sesi awal (latih), 20% sesi akhir (uji).
    service_split = chronological_split(consults, cutoff)
    wait_split = chronological_split(pairs, cutoff)
    log.info("Sampel wait: latih %d, uji %d", len(wait_split.train), len(wait_split.test))

    # [Alur 8] GridSearchCV + GroupKFold(5), Random Forest monoton (rasio).
    service_search = fit_forest(service_split.train, SERVICE_FEATURES, "service_ratio")
    wait_search = fit_forest(wait_split.train, WAIT_FEATURES, "wait_ratio")
    wait_eval_model, service_eval_model = wait_search.best_estimator_, service_search.best_estimator_

    # [Alur 10] Latih ulang parameter terbaik pada seluruh data.
    log.info("Melatih ulang model yang dipasang pada seluruh data...")
    wait_model = refit_all(wait_search, pairs, WAIT_FEATURES, "wait_ratio")
    service_model = refit_all(service_search, consults, SERVICE_FEATURES, "service_ratio")

    hangu_train = service_split.train[service_split.train["source"] == "hangu"]
    cold_start = float(hangu_train["service_min"].mean())
    metrics: dict[str, Any] = {
        "model_version": version,
        "trained_at": datetime.now().isoformat(timespec="seconds"),
        "sources": sources,
        "sessions": {"total": n_sessions, "train": int((np.unique(consults["session_order"]) <= cutoff).sum())},
        "split": f"kronologis per sesi ({1 - config.test_fraction:.0%}/{config.test_fraction:.0%}): "
        f"latih sesi <= {cutoff}, uji sesi > {cutoff}",
        "cutoff_session_order": cutoff,
        "deployed_model": "parameter terbaik dilatih ulang pada SELURUH data; "
        "metrik di bawah dari model yang dilatih pada data latih saja",
        # [Alur 9] Evaluasi pada sesi uji (MAE, RMSE, R^2, CI bootstrap per sesi).
        "wait": evaluate_wait(wait_eval_model, wait_split.test),
        "service": evaluate_service(service_eval_model, service_split.test),
        "incumbent": evaluate_incumbent(config.incumbent_path, wait_split.test),
        "feature_importance": {
            "wait": importances(wait_model, WAIT_FEATURES),
            "service": importances(service_model, SERVICE_FEATURES),
        },
        "best_params": {"wait": wait_search.best_params_, "service": service_search.best_params_},
    }
    # [Alur 11] >= 30 pasangan uji Qcare dan MAE lebih buruk dari model aktif? -> ditolak.
    promote_ok, reason = promotion_decision(metrics)
    metrics["promotion"] = {"approved": promote_ok, "reason": reason}

    config.out_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "wait": wait_model,
            "service": service_model,
            "wait_features": WAIT_FEATURES,
            "service_features": SERVICE_FEATURES,
            "target": "ratio_to_doctor_avg_service_min",
            "version": version,
        },
        config.out_dir / "model.joblib",
        compress=3,
    )
    (config.out_dir / "feature_spec.json").write_text(
        json.dumps(feature_spec(consults, cold_start, version, sources), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    (config.out_dir / "metrics.json").write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False, default=str), encoding="utf-8"
    )
    return metrics


def promote(staging: Path = STAGING_DIR, model_dir: Path = MODEL_DIR) -> None:
    """Pindahkan artefak staging ke folder model (os.replace per file = atomik)."""
    for name in ARTIFACTS:
        os.replace(staging / name, model_dir / name)
    shutil.rmtree(staging, ignore_errors=True)


def main() -> None:
    """CLI: latih, laporkan, lalu pasang bila lolos ``promotion_decision``."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description="Latih model prediksi waktu tunggu Qcare")
    parser.add_argument("--data", type=Path, default=DEFAULT_HANGU_PATH, help="Lokasi Data.csv Hangu")
    parser.add_argument("--test-fraction", type=float, default=TEST_FRACTION)
    parser.add_argument("--no-qcare", action="store_true", help="Latih dengan Hangu saja")
    parser.add_argument("--force", action="store_true", help="Pasang model walau lebih buruk")
    args = parser.parse_args()

    metrics = train(
        TrainConfig(
            hangu_path=args.data,
            database_url=None if args.no_qcare else resolve_database_url(),
            test_fraction=args.test_fraction,
        )
    )
    log.info(json.dumps({k: metrics[k] for k in ("split", "sources", "promotion")}, indent=2, ensure_ascii=False))
    log.info("Wait MAE RF %.3f vs baseline %.3f", metrics["wait"]["random_forest"]["mae_min"],
             metrics["wait"]["baseline_historical_avg"]["mae_min"])
    if metrics["promotion"]["approved"] or args.force:
        promote()
        log.info("Model %s dipasang ke %s", metrics["model_version"], MODEL_DIR)
    else:
        log.warning("Model TIDAK dipasang: %s (pakai --force untuk memaksa)", metrics["promotion"]["reason"])


if __name__ == "__main__":
    main()
