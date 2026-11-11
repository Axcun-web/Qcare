/**
 * Visit-date options for the booking form (Tabel 3.5 skripsi): today plus
 * the next BOOKING_DAYS_AHEAD days, only on weekdays the doctor practises.
 * Keep BOOKING_DAYS_AHEAD in sync with backend/src/utils/queueRules.js.
 */
export const BOOKING_DAYS_AHEAD = 7;

const HARI = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

/** jamMulai / jamSelesai arrive as 1970-01-01 UTC ISO strings. */
const minuteOfTime = (iso) => {
  const t = new Date(iso);
  return t.getUTCHours() * 60 + t.getUTCMinutes();
};

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("id-ID", {
    timeZone: "UTC",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

const toYmd = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

/**
 * @param {Array<{ id: number|string, hari: string, jamMulai: string, jamSelesai: string }>} schedules
 * @param {Date} [now]
 * @returns {Array<{ value: string, tanggal: string, jadwalId: string, label: string }>}
 *   value = "YYYY-MM-DD|jadwalId"
 */
export function visitDateOptions(schedules, now = new Date()) {
  const options = [];
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  for (let offset = 0; offset <= BOOKING_DAYS_AHEAD; offset += 1) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
    );
    const hari = HARI[date.getDay()];
    for (const slot of schedules.filter((s) => s.hari === hari)) {
      // Today's session that has already ended cannot be booked any more.
      if (offset === 0 && nowMinute >= minuteOfTime(slot.jamSelesai)) continue;
      const dayLabel = date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const tanggal = toYmd(date);
      options.push({
        value: `${tanggal}|${slot.id}`,
        tanggal,
        jadwalId: String(slot.id),
        label: `${offset === 0 ? "Hari ini, " : ""}${dayLabel} (${formatTime(slot.jamMulai)} - ${formatTime(slot.jamSelesai)})`,
      });
    }
  }
  return options;
}

/**
 * Long Indonesian date for a queue's tanggal (a DATE column, sent as UTC
 * midnight), e.g. "Kamis, 12 November 2026".
 *
 * @param {string} tanggal
 */
export const formatVisitDate = (tanggal) =>
  new Date(tanggal).toLocaleDateString("id-ID", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Estimated call time as clinic-local clock time, e.g. "± 17.25 WIB".
 *
 * @param {string | null} iso - estimatedCallTime from the API
 */
export const formatCallTime = (iso) =>
  iso
    ? `± ${new Date(iso).toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })} WIB`
    : "-";

/**
 * Greeting by clinic-local hour: Pagi until 11, Siang until 15, Sore until
 * 18, then Malam.
 *
 * @param {Date} [now]
 */
export function greeting(now = new Date()) {
  const hour = Number(
    now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: "numeric", hour12: false }),
  ) % 24;
  if (hour >= 4 && hour < 11) return "Selamat Pagi";
  if (hour >= 11 && hour < 15) return "Selamat Siang";
  if (hour >= 15 && hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

/**
 * How often the patient's queue status refreshes while a same-day queue is
 * active (Tabel 3.9 step 5: "menunggu pembaruan otomatis"). Shorter than the
 * 30 s notification poll so the status page feels live.
 */
export const QUEUE_REFRESH_MS = 15_000;
