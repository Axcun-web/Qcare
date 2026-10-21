import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSnapshots,
  fallbackEstimates,
  SUMBER_ESTIMASI,
  wibClock,
} from "./predictionInput.js";

// Wednesday 2026-09-30 09:15 WIB = 02:15 UTC.
const WED_0915_WIB = new Date("2026-09-30T02:15:00Z");

describe("wibClock", () => {
  it("returns WIB hour and Monday-based weekday", () => {
    assert.deepEqual(wibClock(WED_0915_WIB), { dayOfWeek: 2, hour: 9 });
  });

  it("rolls the day over at WIB midnight, not UTC midnight", () => {
    // 2026-09-30 17:30 UTC = Thursday 00:30 WIB.
    const result = wibClock(new Date("2026-09-30T17:30:00Z"));

    assert.deepEqual(result, { dayOfWeek: 3, hour: 0 });
  });
});

describe("buildSnapshots", () => {
  it("counts only active patients ahead, including the one in service", () => {
    const entries = [
      { id: 1n, status: "SELESAI" },
      { id: 2n, status: "DILEWATI" },
      { id: 3n, status: "SEDANG_DILAYANI" },
      { id: 4n, status: "MENUNGGU" },
      { id: 5n, status: "MENUNGGU" },
    ];

    const snapshots = buildSnapshots(entries, WED_0915_WIB, 12);

    assert.deepEqual(
      snapshots.map((s) => [
        s.antreanId,
        s.input.queue_position,
        s.input.patients_ahead,
      ]),
      [
        [3n, 3, 0],
        [4n, 4, 1],
        [5n, 5, 2],
      ],
    );
    assert.equal(snapshots[0].input.day_of_week, 2);
    assert.equal(snapshots[0].input.hour, 9);
    assert.equal(snapshots[0].input.doctor_avg_service_min, 12);
  });

  it("gives the first waiting patient 0 ahead when nobody is in service", () => {
    const snapshots = buildSnapshots(
      [{ id: 1n, status: "MENUNGGU" }],
      WED_0915_WIB,
      12,
    );

    assert.equal(snapshots[0].input.patients_ahead, 0);
  });
});

describe("fallbackEstimates", () => {
  it("multiplies patients ahead by the doctor average, rounded to minutes", () => {
    const snapshots = buildSnapshots(
      [
        { id: 1n, status: "SEDANG_DILAYANI" },
        { id: 2n, status: "MENUNGGU" },
        { id: 3n, status: "MENUNGGU" },
      ],
      WED_0915_WIB,
      13.451,
    );

    const estimates = fallbackEstimates(snapshots, SUMBER_ESTIMASI.DEFAULT);

    assert.deepEqual(
      estimates.map((e) => e.estimasiMenit),
      [0, 13, 27],
    );
    assert.equal(estimates[2].estimasiDurasiAntrean, 13);
    assert.equal(estimates[2].sumberEstimasi, "DEFAULT");
  });
});
