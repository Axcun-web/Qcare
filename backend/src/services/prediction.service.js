import { config } from "../config/index.js";
import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
import {
  buildSnapshots,
  fallbackEstimates,
  SUMBER_ESTIMASI,
} from "../utils/predictionInput.js";

/**
 * Integrasi layanan prediksi FastAPI (UC Lihat Estimasi Waktu).
 *
 * Setiap kali antrean suatu sesi dokter (jadwal + tanggal) berubah, estimasi
 * seluruh pasien yang masih aktif dihitung ulang dan dicatat ke
 * PredictionHistory. Bila layanan prediksi tidak dapat diakses, dipakai
 * estimasi rata-rata historis (UC exception 1 dan 2).
 */

// Nilai dari prediction-service/model/feature_spec.json.
const COLD_START_AVG_SERVICE_MIN = 13.451;
const REQUEST_TIMEOUT_MS = 1500;
// The retrain call is fire-and-forget (nothing waits on it), and the service
// first counts new Qcare rows in Postgres, so it gets a longer budget.
const RETRAIN_REQUEST_TIMEOUT_MS = 5000;

/**
 * Rata-rata jangka panjang SELURUH durasi pelayanan dokter. Dipakai sebagai
 * pengali hasil model (bukan fitur) sekaligus basis estimasi fallback.
 *
 * @param {bigint} doctorId
 * @returns {Promise<{ avg: number, hasHistory: boolean }>}
 */
export async function doctorAvgServiceMin(doctorId) {
  const { _avg } = await prisma.serviceHistory.aggregate({
    // durasi 0 = antrean diselesaikan tanpa pernah dilayani (lihat changeStatus).
    where: { doctorId, durasiPelayanan: { gt: 0 } },
    _avg: { durasiPelayanan: true },
  });
  if (_avg.durasiPelayanan === null)
    return { avg: COLD_START_AVG_SERVICE_MIN, hasHistory: false };
  return { avg: _avg.durasiPelayanan, hasHistory: true };
}

/**
 * @param {{ input: object }[]} snapshots
 * @throws {Error} bila layanan tidak terjangkau, timeout, atau non-2xx
 */
async function requestModel(snapshots) {
  const response = await fetch(
    `${config.PREDICTION_SERVICE_URL}/predict/batch`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: snapshots.map((s) => s.input) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  if (!response.ok)
    throw new Error(`Layanan prediksi merespons HTTP ${response.status}`);
  const results = await response.json();
  return results.map((r) => ({
    estimasiMenit: Math.round(r.estimated_wait_min),
    estimasiDurasiAntrean: Math.round(r.estimated_service_min),
    sumberEstimasi: SUMBER_ESTIMASI.ML,
  }));
}

export const predictionService = {
  /**
   * Asks the prediction service to retrain on the latest data (Hangu + Qcare
   * ServiceHistory). Fire-and-forget: the service answers immediately and
   * decides itself whether enough new completed queues exist; training runs
   * in its background. Never throws - a failed request only logs a warning.
   *
   * @returns {Promise<void>}
   */
  async requestRetrain() {
    if (!config.PREDICTION_SERVICE_URL || !config.PREDICTION_TRAIN_TOKEN)
      return;
    try {
      // [Alur 3] POST /train dengan header X-Train-Token.
      const response = await fetch(`${config.PREDICTION_SERVICE_URL}/train`, {
        method: "POST",
        headers: { "X-Train-Token": config.PREDICTION_TRAIN_TOKEN },
        signal: AbortSignal.timeout(RETRAIN_REQUEST_TIMEOUT_MS),
      });
      const body = await response.json();
      logger.debug(
        "Retrain request:",
        response.status,
        body.state,
        body.reason ?? "",
      );
    } catch (err) {
      logger.warn("Permintaan retrain model gagal:", err.message);
    }
  },

  /**
   * Menghitung ulang dan mencatat estimasi semua antrean aktif pada satu
   * sesi dokter.
   *
   * @param {{ doctorId: bigint, jadwalId: bigint, tanggal: Date }} session
   * @param {Date} [now]
   * @returns {Promise<Map<string, { estimasiMenit: number,
   *   estimasiDurasiAntrean: number, sumberEstimasi: string }>>}
   *   antreanId (string) -> estimasi
   */
  async refreshSession({ doctorId, jadwalId, tanggal }, now = new Date()) {
    const entries = await prisma.antrean.findMany({
      where: { jadwalId, tanggal, status: { not: "DIBATALKAN" } },
      orderBy: { nomorAntrean: "asc" },
      select: { id: true, status: true },
    });
    const { avg, hasHistory } = await doctorAvgServiceMin(doctorId);
    const snapshots = buildSnapshots(entries, now, avg);
    if (snapshots.length === 0) return new Map();

    let estimates;
    try {
      if (!config.PREDICTION_SERVICE_URL)
        throw new Error("PREDICTION_SERVICE_URL belum diatur");
      estimates = await requestModel(snapshots);
    } catch (err) {
      logger.warn(
        "Prediksi ML gagal, memakai rata-rata historis:",
        err.message,
      );
      estimates = fallbackEstimates(
        snapshots,
        hasHistory ? SUMBER_ESTIMASI.HISTORICAL_AVG : SUMBER_ESTIMASI.DEFAULT,
      );
    }

    await prisma.predictionHistory.createMany({
      data: snapshots.map((s, i) => ({
        antreanId: s.antreanId,
        doctorId,
        tanggal,
        ...estimates[i],
      })),
    });
    return new Map(
      snapshots.map((s, i) => [s.antreanId.toString(), estimates[i]]),
    );
  },
};
