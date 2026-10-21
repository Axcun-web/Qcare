"""Unit tests for the dynamic dataset loader and the session split."""

from datetime import date, datetime, timezone

import pandas as pd
import pytest

from training.dataset import COLD_START_AVG_SERVICE_MIN, finalize, load_hangu, qcare_rows_to_frame
from training.train import build_wait_pairs, chronological_split, compute_cutoff


def qcare_row(jadwal: int, day: date, doctor: int, utc_start: str, minutes: int) -> tuple:
    """One row as returned by QCARE_ROWS_SQL (timestamptz comes back in UTC)."""
    started = datetime.fromisoformat(utc_start).replace(tzinfo=timezone.utc)
    return (jadwal, day, doctor, started, minutes)


@pytest.fixture(scope="module")
def hangu() -> pd.DataFrame:
    return load_hangu()


def test_hangu_split_is_80_20_by_session(hangu: pd.DataFrame) -> None:
    consults = finalize([hangu])

    cutoff = compute_cutoff(consults, 0.2)

    assert consults["session_order"].nunique() == 381
    assert cutoff == 304


def test_qcare_rows_use_wib_hour_and_monday_based_day() -> None:
    # 2026-10-14 is a Wednesday; 02:10 UTC = 09:10 WIB.
    frame = qcare_row(5, date(2026, 10, 14), 2, "2026-10-14T02:10:00", 12)

    row = qcare_rows_to_frame([frame]).iloc[0]

    assert (row["hour"], row["day_of_week"]) == (9, 2)
    assert row["start_min"] == pytest.approx(9 * 60 + 10)
    assert row["service_min"] == 12.0
    assert row["session"] == "qcare-20261014-j5"


def test_qcare_sessions_follow_hangu_and_order_by_time(hangu: pd.DataFrame) -> None:
    rows = [
        qcare_row(7, date(2026, 10, 15), 3, "2026-10-15T01:00:00", 10),
        qcare_row(5, date(2026, 10, 14), 2, "2026-10-14T01:00:00", 10),
    ]

    consults = finalize([hangu, qcare_rows_to_frame(rows)])
    order = consults.groupby("session")["session_order"].first()

    assert order["qcare-20261014-j5"] == 382
    assert order["qcare-20261015-j7"] == 383


def test_new_qcare_doctor_starts_from_cold_start_average(hangu: pd.DataFrame) -> None:
    rows = [
        qcare_row(5, date(2026, 10, 14), 2, "2026-10-14T01:00:00", 10),
        qcare_row(5, date(2026, 10, 14), 2, "2026-10-14T01:15:00", 20),
    ]

    consults = finalize([hangu, qcare_rows_to_frame(rows)])
    qcare = consults[consults["source"] == "qcare"]

    assert qcare["doctor_avg_service_min"].tolist() == [COLD_START_AVG_SERVICE_MIN, 10.0]


def test_wait_pairs_use_served_order_so_waits_are_never_negative() -> None:
    rows = [
        qcare_row(5, date(2026, 10, 14), 2, "2026-10-14T01:30:00", 10),
        qcare_row(5, date(2026, 10, 14), 2, "2026-10-14T01:00:00", 10),
        qcare_row(5, date(2026, 10, 14), 2, "2026-10-14T01:12:00", 10),
    ]

    pairs = build_wait_pairs(finalize([qcare_rows_to_frame(rows)]))

    assert (pairs["wait_min"] > 0).all()
    assert sorted(pairs["wait_min"].round().tolist()) == [12, 18, 30]


def test_split_puts_latest_sessions_in_test(hangu: pd.DataFrame) -> None:
    consults = finalize([hangu])

    split = chronological_split(consults, compute_cutoff(consults, 0.2))

    assert split.train["session_order"].max() == 304
    assert split.test["session_order"].min() == 305
