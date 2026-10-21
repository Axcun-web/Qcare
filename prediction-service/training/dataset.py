"""Pemuat dataset dinamis untuk model prediksi Qcare.

Menggabungkan dua sumber menjadi satu tabel konsultasi yang terurut kronologis:

1. **Hangu** (Feng et al., 2023) - data publik 2018-2019, dipakai sebagai
   pra-pelatihan. Bila ``Data.csv`` belum ada, diunduh otomatis dari Zenodo.
2. **Qcare** - antrean SELESAI milik klinik sendiri dari PostgreSQL. Satu sesi
   Qcare = satu jadwal praktik dokter pada satu tanggal.

Setiap sesi mendapat ``session_order`` global (Hangu dulu, lalu Qcare menurut
waktu), sehingga pembagian latih/uji 80/20 per sesi dihitung ulang setiap kali
data bertambah; tidak ada angka cutoff yang ditulis manual.
"""

from __future__ import annotations

import hashlib
import io
import logging
import os
import zipfile
from collections.abc import Iterable
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit
from urllib.request import urlopen

import pandas as pd

log = logging.getLogger("train.dataset")

HERE = Path(__file__).resolve().parent
DEFAULT_HANGU_PATH = HERE / "data" / "Data.csv"
BACKEND_ENV_PATH = HERE.parent.parent / "backend" / ".env"
HANGU_ZIP_URL = (
    "https://zenodo.org/records/7476233/files/fenghaolin/HanguData-release.zip?download=1"
)
DOWNLOAD_TIMEOUT_S = 60
# SHA-256 dari Data.csv rilis Zenodo 7476233; menjamin data latih tidak berubah diam-diam.
HANGU_SHA256 = "bf4e377c0fd9b4adf65a53b2b2a53d60391808dfdc6d752877c28b6b05956bc8"
HANGU_EXTRA_FILES = {"LICENSE": "LICENSE", "CITATION.cff": "CITATION.cff", "README.md": "HANGU_README.md"}
# Rata-rata durasi Hangu (menit) untuk pasien pertama dokter Qcare yang belum
# punya riwayat; sama dengan COLD_START_AVG_SERVICE_MIN di backend.
COLD_START_AVG_SERVICE_MIN = 13.451

SECONDS_PER_MINUTE = 60.0
WIB = timezone(timedelta(hours=7))  # tanpa DST, sama dengan backend (wibHour)
HANGU_DOCTOR = "hangu"

# Senin=0 ... Minggu=6 (sama dengan datetime.weekday()).
DAY_INDEX = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
    "Sunday": 6,
}

# Antrean yang benar-benar dilayani: punya waktu mulai layanan dan durasi > 0
# (durasi 0 = diselesaikan tanpa pernah "Mulai Dilayani", lihat changeStatus).
QCARE_COMPLETED_FILTER = """
    a.status = 'SELESAI'
    AND a.timestamp_mulai_layanan IS NOT NULL
    AND sh.durasi_pelayanan > 0
"""
QCARE_ROWS_SQL = f"""
    SELECT a.jadwal_id, a.tanggal, a.doctor_id, a.timestamp_mulai_layanan,
           sh.durasi_pelayanan
    FROM antrean a
    JOIN service_history sh ON sh.antrean_id = a.id
    WHERE {QCARE_COMPLETED_FILTER}
    ORDER BY a.timestamp_mulai_layanan
"""
QCARE_COUNT_SQL = f"""
    SELECT COUNT(*)
    FROM antrean a
    JOIN service_history sh ON sh.antrean_id = a.id
    WHERE {QCARE_COMPLETED_FILTER}
"""

COLUMNS = ["session", "doctor", "source", "start_min", "hour", "day_of_week", "service_min"]


def ensure_hangu(path: Path = DEFAULT_HANGU_PATH) -> Path:
    """Pastikan ``Data.csv`` Hangu tersedia; unduh dari Zenodo bila belum ada.

    Args:
        path: Lokasi tujuan Data.csv.

    Returns:
        ``path`` yang dijamin ada dan lolos verifikasi SHA-256.

    Raises:
        ValueError: Isi Data.csv tidak sama dengan rilis yang dipin.
    """
    if not path.exists():
        log.info("Data.csv tidak ditemukan, mengunduh dataset Hangu dari Zenodo...")
        with urlopen(HANGU_ZIP_URL, timeout=DOWNLOAD_TIMEOUT_S) as response:  # noqa: S310 - URL konstan
            archive = zipfile.ZipFile(io.BytesIO(response.read()))
        path.parent.mkdir(parents=True, exist_ok=True)
        for name in archive.namelist():
            base = name.rsplit("/", 1)[-1]
            if base == "Data.csv":
                path.write_bytes(archive.read(name))
            elif base in HANGU_EXTRA_FILES:  # lisensi CC BY-NC-SA mewajibkan atribusi
                (path.parent / HANGU_EXTRA_FILES[base]).write_bytes(archive.read(name))
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != HANGU_SHA256:
        raise ValueError(f"Data.csv Hangu tidak sesuai rilis yang dipin (sha256 {digest})")
    return path


def load_hangu(path: Path = DEFAULT_HANGU_PATH) -> pd.DataFrame:
    """Muat Hangu ``Data.csv`` ke skema konsultasi bersama.

    Args:
        path: Lokasi Data.csv (diunduh otomatis bila belum ada).

    Returns:
        DataFrame dengan kolom ``COLUMNS``.
    """
    raw = pd.read_csv(ensure_hangu(path))
    start = pd.to_timedelta(raw["StartTime"])
    return pd.DataFrame(
        {
            # Nomor sesi Hangu naik mengikuti waktu; tiga digit menjaga urutan string.
            "session": "hangu-" + raw["Session"].astype(int).map("{:03d}".format),
            "doctor": HANGU_DOCTOR,
            "source": "hangu",
            "start_min": start.dt.total_seconds() / SECONDS_PER_MINUTE,
            "hour": start.dt.components.hours,
            "day_of_week": raw["DayOfWeek"].map(DAY_INDEX),
            "service_min": raw["ServTime"] / SECONDS_PER_MINUTE,
        }
    )


def qcare_rows_to_frame(rows: Iterable[tuple[Any, ...]]) -> pd.DataFrame:
    """Ubah baris hasil ``QCARE_ROWS_SQL`` ke skema konsultasi bersama.

    Args:
        rows: Tuple ``(jadwal_id, tanggal, doctor_id, timestamp_mulai_layanan,
            durasi_pelayanan)``; timestamp bertipe datetime ber-zona waktu.

    Returns:
        DataFrame dengan kolom ``COLUMNS`` plus ``started_at`` (untuk urutan sesi).
    """
    records = []
    for jadwal_id, tanggal, doctor_id, started_at, durasi in rows:
        local: datetime = started_at.astimezone(WIB)
        records.append(
            {
                "session": f"qcare-{tanggal:%Y%m%d}-j{jadwal_id}",
                "doctor": f"qcare-{doctor_id}",
                "source": "qcare",
                "start_min": local.hour * 60 + local.minute + local.second / SECONDS_PER_MINUTE,
                "hour": local.hour,
                "day_of_week": local.weekday(),
                "service_min": float(durasi),
                "started_at": started_at,
            }
        )
    return pd.DataFrame.from_records(records, columns=[*COLUMNS, "started_at"])


def backend_setting(env_name: str, backend_key: str) -> str | None:
    """Baca konfigurasi: env ``env_name`` dulu, lalu ``backend_key`` di ``backend/.env``.

    Dengan begitu layanan prediksi memakai satu sumber konfigurasi yang sama
    dengan backend (URL database, token pelatihan) tanpa disalin manual.
    """
    value = os.getenv(env_name)
    if value or not BACKEND_ENV_PATH.exists():
        return value or None
    for line in BACKEND_ENV_PATH.read_text(encoding="utf-8").splitlines():
        key, _, raw = line.partition("=")
        if key.strip() == backend_key:
            return raw.strip().strip('"').strip("'") or None
    return None


def resolve_database_url() -> str | None:
    """Ambil URL PostgreSQL Qcare untuk psycopg.

    Urutan: env ``QCARE_DATABASE_URL``, lalu ``DATABASE_URL`` di ``backend/.env``.
    Parameter query Prisma seperti ``?schema=public`` dibuang karena tidak
    dikenal libpq.

    Returns:
        URL koneksi, atau None bila tidak terkonfigurasi.
    """
    url = backend_setting("QCARE_DATABASE_URL", "DATABASE_URL")
    if not url:
        return None
    parts = urlsplit(url)
    # localhost resolves to ::1 first, but Docker publishes Postgres on IPv4
    # 127.0.0.1 only, so every connect would first wait out the IPv6 timeout.
    netloc = parts.netloc.replace("@localhost:", "@127.0.0.1:")
    return urlunsplit((parts.scheme, netloc, parts.path, "", ""))


def _query(database_url: str, sql: str) -> list[tuple[Any, ...]]:
    """Jalankan satu query read-only dan kembalikan seluruh baris."""
    import psycopg  # impor lambat: pelatihan Hangu-saja tidak butuh driver DB

    with psycopg.connect(database_url, connect_timeout=5) as conn, conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchall()


def load_qcare(database_url: str) -> pd.DataFrame:
    """Muat antrean SELESAI Qcare dari PostgreSQL."""
    return qcare_rows_to_frame(_query(database_url, QCARE_ROWS_SQL))


def count_qcare_records(database_url: str) -> int:
    """Jumlah antrean Qcare yang memenuhi syarat sebagai data latih."""
    return int(_query(database_url, QCARE_COUNT_SQL)[0][0])


def finalize(frames: list[pd.DataFrame]) -> pd.DataFrame:
    """Gabungkan sumber, urutkan kronologis, dan turunkan fitur bersama.

    * ``session_order``: 1..N global; Hangu (2018-2019) mendahului Qcare, dan
      sesi Qcare diurutkan menurut waktu mulai layanan pertamanya.
    * ``queue_position``: urutan pasien dalam sesi (1-based).
    * ``doctor_avg_service_min``: rata-rata SELURUH pelayanan dokter yang sama
      sebelum pasien ini (shift -> tanpa bocoran), seperti Qcare menghitungnya
      dari ServiceHistory dokter. Pasien pertama dokter Qcare memakai
      ``COLD_START_AVG_SERVICE_MIN`` seperti backend; baris pertama Hangu tetap
      dibuang agar hasil Hangu-saja identik dengan model v2.

    Args:
        frames: Output :func:`load_hangu` / :func:`qcare_rows_to_frame`.

    Returns:
        DataFrame konsultasi siap pakai untuk pelatihan.
    """
    df = pd.concat([f for f in frames if not f.empty], ignore_index=True)
    first_start = df.groupby("session", sort=False).agg(
        source=("source", "first"),
        started_at=("started_at", "min") if "started_at" in df else ("session", "first"),
    )
    hangu = first_start[first_start["source"] == "hangu"].sort_index()
    qcare = first_start[first_start["source"] == "qcare"].sort_values("started_at")
    order = {name: i + 1 for i, name in enumerate([*hangu.index, *qcare.index])}
    df["session_order"] = df["session"].map(order)

    df = df.sort_values(["session_order", "start_min"]).reset_index(drop=True)
    df["queue_position"] = df.groupby("session").cumcount() + 1
    df["doctor_avg_service_min"] = df.groupby("doctor")["service_min"].transform(
        lambda s: s.shift(1).expanding(min_periods=1).mean()
    )
    first_qcare_visit = (df["source"] == "qcare") & df["doctor_avg_service_min"].isna()
    df.loc[first_qcare_visit, "doctor_avg_service_min"] = COLD_START_AVG_SERVICE_MIN
    df = df.dropna(subset=["doctor_avg_service_min"]).reset_index(drop=True)
    df["service_ratio"] = df["service_min"] / df["doctor_avg_service_min"]
    return df.drop(columns=["started_at"], errors="ignore")


def load_dataset(
    hangu_path: Path = DEFAULT_HANGU_PATH, database_url: str | None = None
) -> tuple[pd.DataFrame, dict[str, int]]:
    """Muat semua sumber yang tersedia.

    Qcare dilewati (dengan peringatan) bila URL tidak ada atau database tidak
    terjangkau, agar pelatihan tetap jalan dengan Hangu saja.

    Args:
        hangu_path: Lokasi Data.csv Hangu.
        database_url: URL PostgreSQL Qcare, atau None untuk Hangu saja.

    Returns:
        ``(consultations, sources)`` dengan ``sources`` = jumlah baris mentah
        per sumber, mis. ``{"hangu": 6637, "qcare": 12}``.
    """
    hangu = load_hangu(hangu_path)
    qcare = qcare_rows_to_frame([])
    if database_url:
        try:
            qcare = load_qcare(database_url)
        except Exception as exc:  # noqa: BLE001 - driver bisa melempar banyak tipe; Qcare opsional
            log.warning("Data Qcare dilewati (database tidak terjangkau): %s", exc)
    sources = {"hangu": len(hangu), "qcare": len(qcare)}
    return finalize([hangu, qcare]), sources
