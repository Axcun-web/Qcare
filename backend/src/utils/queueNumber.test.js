import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatQueueNumber, nextQueueNumber } from "./queueNumber.js";

// Minimal stand-in for the Prisma transaction client: aggregate over
// in-memory rows.
function fakeTx(rows = []) {
  return {
    rows,
    antrean: {
      async aggregate({ where }) {
        const matching = rows.filter(
          (r) =>
            r.doctorId === where.doctorId &&
            r.tanggal.getTime() === where.tanggal.getTime(),
        );
        const max = matching.length
          ? Math.max(...matching.map((r) => r.nomorAntrean))
          : null;
        return { _max: { nomorAntrean: max } };
      },
    },
  };
}

async function book(tx, doctorId, tanggal, jadwalId = doctorId) {
  const nomorAntrean = await nextQueueNumber(tx, doctorId, tanggal);
  tx.rows.push({ doctorId, jadwalId, tanggal, nomorAntrean });
  return formatQueueNumber(doctorId, nomorAntrean);
}

const DAY = new Date("2026-10-16T00:00:00Z");

describe("formatQueueNumber", () => {
  it("pads to two digits with the doctor prefix", () => {
    assert.equal(formatQueueNumber(3n, 5), "D3-05");
    assert.equal(formatQueueNumber(12, 123), "D12-123");
  });
});

describe("nextQueueNumber", () => {
  it("numbers two doctors on the same day independently", async () => {
    const tx = fakeTx();

    const issued = [
      await book(tx, 3n, DAY),
      await book(tx, 7n, DAY),
      await book(tx, 3n, DAY),
      await book(tx, 3n, DAY),
      await book(tx, 7n, DAY),
    ];

    assert.deepEqual(issued, ["D3-01", "D7-01", "D3-02", "D3-03", "D7-02"]);
  });

  it("restarts at 01 on a new day", async () => {
    const tx = fakeTx();
    await book(tx, 3n, DAY);
    await book(tx, 3n, DAY);

    const nextDay = new Date("2026-10-17T00:00:00Z");

    assert.equal(await book(tx, 3n, nextDay), "D3-01");
  });

  it("continues one sequence across a doctor's several jadwal", async () => {
    const tx = fakeTx();
    await book(tx, 3n, DAY, 10n);

    assert.equal(await book(tx, 3n, DAY, 11n), "D3-02");
  });
});
