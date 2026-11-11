import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  transitionError,
  bookingDateError,
  isFutureVisit,
  findOverlappingSlot,
  estimateCallTime,
  BOOKING_DAYS_AHEAD,
} from "./queueRules.js";

const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
const time = (hhmm) => new Date(`1970-01-01T${hhmm}:00.000Z`);

describe("transitionError (staff)", () => {
  const staff = (from, to) => transitionError({ from, to, role: "PETUGAS" });

  test("allows the normal flow", () => {
    assert.equal(staff("MENUNGGU", "SEDANG_DIPANGGIL"), null);
    assert.equal(staff("SEDANG_DIPANGGIL", "SEDANG_DILAYANI"), null);
    assert.equal(staff("SEDANG_DILAYANI", "SELESAI"), null);
  });

  test("allows skip from waiting or called", () => {
    assert.equal(staff("MENUNGGU", "DILEWATI"), null);
    assert.equal(staff("SEDANG_DIPANGGIL", "DILEWATI"), null);
  });

  test("refuses Selesai without Panggil and Dilayani (Tabel 3.13 exc. 2)", () => {
    assert.match(staff("MENUNGGU", "SELESAI"), /dipanggil dan dilayani/);
    assert.match(
      staff("SEDANG_DIPANGGIL", "SELESAI"),
      /dipanggil dan dilayani/,
    );
  });

  test("refuses any change after a final status (Tabel 3.16)", () => {
    for (const from of ["SELESAI", "DILEWATI", "DIBATALKAN"]) {
      assert.match(staff(from, "MENUNGGU"), /tidak dapat diubah lagi/);
      assert.match(staff(from, "DIBATALKAN"), /tidak dapat diubah lagi/);
    }
  });

  test("refuses cancelling a patient who is being served", () => {
    assert.ok(staff("SEDANG_DILAYANI", "DIBATALKAN"));
  });
});

describe("transitionError (patient)", () => {
  const patient = (from, to) => transitionError({ from, to, role: "PASIEN" });

  test("allows cancelling while waiting", () => {
    assert.equal(patient("MENUNGGU", "DIBATALKAN"), null);
  });

  test("refuses cancelling once called", () => {
    assert.match(patient("SEDANG_DIPANGGIL", "DIBATALKAN"), /sudah dipanggil/);
  });

  test("refuses anything other than cancel", () => {
    assert.match(
      patient("MENUNGGU", "SEDANG_DIPANGGIL"),
      /hanya dapat membatalkan/,
    );
  });
});

describe("bookingDateError", () => {
  const today = day("2026-11-10");

  test("allows today and the last day of the window", () => {
    assert.equal(bookingDateError(day("2026-11-10"), today), null);
    assert.equal(bookingDateError(day("2026-11-17"), today), null);
  });

  test("refuses the past", () => {
    assert.match(bookingDateError(day("2026-11-09"), today), /masa lalu/);
  });

  test(`refuses more than ${BOOKING_DAYS_AHEAD} days ahead`, () => {
    assert.match(bookingDateError(day("2026-11-18"), today), /maksimal/);
  });

  test("refuses an invalid date", () => {
    assert.match(
      bookingDateError(new Date("bukan tanggal"), today),
      /tidak valid/,
    );
  });
});

test("isFutureVisit is true only after today", () => {
  const today = day("2026-11-10");
  assert.equal(isFutureVisit(day("2026-11-10"), today), false);
  assert.equal(isFutureVisit(day("2026-11-11"), today), true);
});

describe("findOverlappingSlot", () => {
  const existing = [
    {
      id: 1n,
      hari: "SENIN",
      jamMulai: time("08:00"),
      jamSelesai: time("12:00"),
    },
    {
      id: 2n,
      hari: "SELASA",
      jamMulai: time("08:00"),
      jamSelesai: time("12:00"),
    },
  ];
  const slot = (hari, a, b) => ({
    hari,
    jamMulai: time(a),
    jamSelesai: time(b),
  });

  test("finds an overlap on the same day", () => {
    assert.equal(
      findOverlappingSlot(slot("SENIN", "11:00", "14:00"), existing)?.id,
      1n,
    );
  });

  test("touching ranges do not overlap", () => {
    assert.equal(
      findOverlappingSlot(slot("SENIN", "12:00", "16:00"), existing),
      null,
    );
  });

  test("other days do not overlap", () => {
    assert.equal(
      findOverlappingSlot(slot("RABU", "08:00", "12:00"), existing),
      null,
    );
  });

  test("ignores the slot being edited", () => {
    assert.equal(
      findOverlappingSlot(slot("SENIN", "09:00", "13:00"), existing, 1n),
      null,
    );
  });
});

describe("estimateCallTime", () => {
  const visitDate = day("2026-11-10");
  const sessionStart = time("16:00"); // 16:00 WIB = 09:00 UTC

  test("counts from now when the session is running", () => {
    const now = new Date("2026-11-10T10:00:00.000Z"); // 17:00 WIB
    const call = estimateCallTime({ now, visitDate, sessionStart, waitMinutes: 25 });
    assert.equal(call.toISOString(), "2026-11-10T10:25:00.000Z"); // 17:25 WIB
  });

  test("counts from the session start before it begins", () => {
    const now = new Date("2026-11-10T06:00:00.000Z"); // 13:00 WIB
    const call = estimateCallTime({ now, visitDate, sessionStart, waitMinutes: 30 });
    assert.equal(call.toISOString(), "2026-11-10T09:30:00.000Z"); // 16:30 WIB
  });
});
