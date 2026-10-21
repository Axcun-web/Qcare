"""Pelatihan ulang di latar belakang untuk ``POST /train``.

Hanya satu pelatihan berjalan pada satu waktu (lock). Tanpa ``force``, pelatihan
dilewati bila antrean Qcare SELESAI yang baru (sejak model terakhir dilatih)
kurang dari ``RETRAIN_MIN_NEW_RECORDS``: skripsi menyebut model dilatih ulang
setiap "Selesai", dan ambang ini mengelompokkannya agar efisien (satu
pelatihan +/- 45 detik CPU).
"""

from __future__ import annotations

import logging
import os
import threading
from collections.abc import Callable
from datetime import datetime
from typing import Any

from training.dataset import count_qcare_records, resolve_database_url
from training.train import TrainConfig, promote, train

log = logging.getLogger("qcare.trainer")

RETRAIN_MIN_NEW_RECORDS = int(os.getenv("RETRAIN_MIN_NEW_RECORDS", "10"))


class TrainingManager:
    """Menjalankan dan memantau pelatihan ulang.

    Args:
        last_qcare_records: Fungsi yang mengembalikan jumlah baris Qcare yang
            dipakai model saat ini (dari feature_spec.json ``sources``).
        on_promoted: Dipanggil setelah model baru dipasang (memuat ulang model).
    """

    def __init__(
        self, last_qcare_records: Callable[[], int], on_promoted: Callable[[], None]
    ) -> None:
        self._lock = threading.Lock()
        self._last_qcare_records = last_qcare_records
        self._on_promoted = on_promoted
        self.status: dict[str, Any] = {"state": "idle"}

    def _new_records(self) -> tuple[int | None, str | None]:
        """Jumlah antrean Qcare baru sejak model terakhir, atau alasan gagal menghitung."""
        database_url = resolve_database_url()
        if not database_url:
            return None, "database Qcare belum dikonfigurasi"
        try:
            current = count_qcare_records(database_url)
        except Exception as exc:  # noqa: BLE001 - psycopg punya banyak tipe error koneksi
            return None, f"database Qcare tidak terjangkau: {exc}"
        return current - self._last_qcare_records(), None

    def request(self, force: bool = False) -> dict[str, Any]:
        """Mulai pelatihan bila layak; tidak pernah memblokir.

        Returns:
            Status terkini (``running`` / ``skipped`` / ``started``).
        """
        if not self._lock.acquire(blocking=False):
            return {**self.status, "note": "pelatihan lain sedang berjalan"}
        try:
            # [Alur 4] >= 10 data Selesai baru atau force? Tidak -> pelatihan ulang dilewati.
            if not force:
                new_records, problem = self._new_records()
                if problem or new_records < RETRAIN_MIN_NEW_RECORDS:
                    reason = problem or (
                        f"baru {new_records} antrean Qcare selesai sejak pelatihan terakhir "
                        f"(minimal {RETRAIN_MIN_NEW_RECORDS})"
                    )
                    self._lock.release()
                    return {"state": "skipped", "reason": reason}
            self.status = {"state": "running", "started_at": _now(), "force": force}
            threading.Thread(target=self._run, args=(force,), daemon=True).start()
            return self.status
        except BaseException:
            self._lock.release()
            raise

    def _run(self, force: bool) -> None:
        """Isi thread pelatihan; melepas lock apa pun hasilnya."""
        try:
            # [Alur 5-11] Lihat training/train.py: train().
            metrics = train(TrainConfig(database_url=resolve_database_url()))
            promoted = metrics["promotion"]["approved"] or force
            # [Alur 12] Model baru dipasang (hot-swap) tanpa restart layanan.
            if promoted:
                promote()
                self._on_promoted()
            self.status = {
                "state": "succeeded",
                "started_at": self.status.get("started_at"),
                "finished_at": _now(),
                "model_version": metrics["model_version"],
                "promoted": promoted,
                "promotion_reason": metrics["promotion"]["reason"],
                "split": metrics["split"],
                "sources": metrics["sources"],
                "wait_mae_min": metrics["wait"]["random_forest"]["mae_min"],
                "wait_baseline_mae_min": metrics["wait"]["baseline_historical_avg"]["mae_min"],
            }
            log.info("Pelatihan selesai: %s", self.status)
        except Exception as exc:  # noqa: BLE001 - laporkan kegagalan apa pun lewat /train/status
            log.exception("Pelatihan gagal")
            self.status = {"state": "failed", "finished_at": _now(), "error": str(exc)}
        finally:
            self._lock.release()


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")
