/**
 * Fungsi murni penyusun input model prediksi waktu tunggu. Dipisah dari
 * prediction.service.js agar dapat diuji tanpa database maupun .env.
 */

const ACTIVE_STATUSES = ["MENUNGGU", "SEDANG_DIPANGGIL", "SEDANG_DILAYANI"];
export const SUMBER_ESTIMASI = {
  ML: "ML",
  HISTORICAL_AVG: "HISTORICAL_AVG",
  DEFAULT: "DEFAULT",
};

// WIB = UTC+7, tanpa DST. Model memakai Senin=0 ... Minggu=6.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * @param {Date} date
 * @returns {{ dayOfWeek: number, hour: number }} hari (Senin=0) dan jam WIB
 */
export function wibClock(date) {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  return { dayOfWeek: (wib.getUTCDay() + 6) % 7, hour: wib.getUTCHours() };
}

/**
 * Menyusun input model untuk setiap antrean aktif dalam satu sesi.
 * queue_position = urutan dalam sesi; patients_ahead = antrean aktif di
 * depannya, termasuk yang sedang dilayani (0 = sedang dilayani/giliran
 * berikutnya).
 *
 * @param {{ id: bigint, status: string }[]} entries antrean non-batal sesi
 *   itu, urut nomorAntrean
 * @param {Date} now waktu prediksi
 * @param {number} doctorAvg rata-rata durasi pelayanan dokter (menit)
 * @returns {{ antreanId: bigint, input: object }[]}
 */
export function buildSnapshots(entries, now, doctorAvg) {
  const { dayOfWeek, hour } = wibClock(now);
  const snapshots = [];
  let activeAhead = 0;
  entries.forEach((entry, index) => {
    if (!ACTIVE_STATUSES.includes(entry.status)) return;
    snapshots.push({
      antreanId: entry.id,
      input: {
        queue_position: index + 1,
        patients_ahead: entry.status === "MENUNGGU" ? activeAhead : 0,
        day_of_week: dayOfWeek,
        hour,
        doctor_avg_service_min: doctorAvg,
      },
    });
    activeAhead += 1;
  });
  return snapshots;
}

/**
 * Estimasi rata-rata historis: pasien di depan × rata-rata durasi dokter.
 *
 * @param {{ input: object }[]} snapshots
 * @param {string} sumberEstimasi
 */
export function fallbackEstimates(snapshots, sumberEstimasi) {
  return snapshots.map(({ input }) => ({
    estimasiMenit: Math.round(
      input.patients_ahead * input.doctor_avg_service_min,
    ),
    estimasiDurasiAntrean: Math.round(input.doctor_avg_service_min),
    sumberEstimasi,
  }));
}
