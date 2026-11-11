/**
 * Queue rules from Bab 3 of the thesis, kept free of Prisma so they can be
 * unit-tested:
 * - status transitions (Tabel 3.13 exc. 2, Tabel 3.14, Tabel 3.16),
 * - the booking date window (Tabel 3.5).
 */

/** Days after today a patient may book (today + 7 = 8 selectable days). */
export const BOOKING_DAYS_AHEAD = 7;

export const FINAL_STATUSES = ["SELESAI", "DILEWATI", "DIBATALKAN"];

/**
 * Allowed next statuses for staff. SELESAI only after SEDANG_DILAYANI, so a
 * queue cannot finish without being called and served (and ServiceHistory
 * always gets a real duration). Final statuses allow nothing.
 */
const STAFF_TRANSITIONS = {
  MENUNGGU: ["SEDANG_DIPANGGIL", "DILEWATI", "DIBATALKAN"],
  SEDANG_DIPANGGIL: ["SEDANG_DILAYANI", "DILEWATI", "DIBATALKAN"],
  SEDANG_DILAYANI: ["SELESAI"],
};

/**
 * Checks a status change. Returns null when allowed, otherwise the message
 * to show (the caller turns it into a 400).
 *
 * @param {{ from: string, to: string, role: string }} change
 * @returns {string | null}
 */
export function transitionError({ from, to, role }) {
  if (FINAL_STATUSES.includes(from))
    return "Antrean yang sudah selesai, dilewati, atau dibatalkan tidak dapat diubah lagi";
  if (role === "PASIEN") {
    if (to !== "DIBATALKAN") return "Pasien hanya dapat membatalkan antrean";
    if (from !== "MENUNGGU")
      return "Antrean yang sudah dipanggil tidak dapat dibatalkan oleh pasien";
    return null;
  }
  if (to === "SELESAI" && from !== "SEDANG_DILAYANI")
    return "Antrean harus dipanggil dan dilayani sebelum diselesaikan";
  if (!(STAFF_TRANSITIONS[from] ?? []).includes(to))
    return `Status tidak dapat diubah dari ${from} ke ${to}`;
  return null;
}

/**
 * Whole days between two UTC-midnight dates (as produced by startOfDay).
 *
 * @param {Date} from
 * @param {Date} to
 */
const daysBetween = (from, to) => Math.round((to - from) / 86_400_000);

/**
 * Checks a booking date against today. Both are UTC-midnight dates.
 * Returns null when allowed, otherwise the message to show.
 *
 * @param {Date} visitDate
 * @param {Date} today
 * @returns {string | null}
 */
export function bookingDateError(visitDate, today) {
  if (Number.isNaN(visitDate.getTime())) return "Tanggal kunjungan tidak valid";
  const diff = daysBetween(today, visitDate);
  if (diff < 0) return "Tanggal kunjungan tidak boleh di masa lalu";
  if (diff > BOOKING_DAYS_AHEAD)
    return `Tanggal kunjungan maksimal ${BOOKING_DAYS_AHEAD} hari dari hari ini`;
  return null;
}

/**
 * True when the visit is after today, so no live estimate exists yet (the
 * prediction model needs the day's session).
 *
 * @param {Date} visitDate
 * @param {Date} today
 */
export const isFutureVisit = (visitDate, today) =>
  daysBetween(today, visitDate) > 0;

/**
 * "HH:MM" of a TIME column (Prisma returns 1970-01-01 UTC Dates) to minutes.
 *
 * @param {Date} time
 */
const minuteOfTime = (time) => time.getUTCHours() * 60 + time.getUTCMinutes();

/**
 * Finds an existing slot of the same doctor and day whose time range
 * overlaps the new one (Tabel 3.17 conflict check). Touching ranges
 * (08:00-12:00 and 12:00-16:00) do not overlap.
 *
 * @param {{ hari: string, jamMulai: Date, jamSelesai: Date }} slot
 * @param {Array<{ id: bigint, hari: string, jamMulai: Date, jamSelesai: Date }>} existing
 * @param {bigint} [ignoreId] - the slot being edited
 */
export function findOverlappingSlot(slot, existing, ignoreId) {
  const start = minuteOfTime(slot.jamMulai);
  const end = minuteOfTime(slot.jamSelesai);
  return (
    existing.find(
      (other) =>
        other.id !== ignoreId &&
        other.hari === slot.hari &&
        start < minuteOfTime(other.jamSelesai) &&
        minuteOfTime(other.jamMulai) < end,
    ) ?? null
  );
}

// WIB = UTC+7, no DST: practice hours are local clinic time.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Estimated clock time the patient is called ("estimasi jam dipanggil",
 * Bab 1 §1.3): the wait estimate counted from now, or from the session start
 * when the session has not begun yet.
 *
 * @param {{ now: Date, visitDate: Date, sessionStart: Date, waitMinutes: number }} input
 *   visitDate: UTC midnight of the local visit date (startOfDay);
 *   sessionStart: the slot's jamMulai (TIME column, 1970-01-01 UTC)
 * @returns {Date}
 */
export function estimateCallTime({ now, visitDate, sessionStart, waitMinutes }) {
  const sessionStartAt =
    visitDate.getTime() + minuteOfTime(sessionStart) * 60_000 - WIB_OFFSET_MS;
  const base = Math.max(now.getTime(), sessionStartAt);
  return new Date(base + waitMinutes * 60_000);
}
