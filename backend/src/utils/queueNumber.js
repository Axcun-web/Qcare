/**
 * Queue numbering: every doctor has an isolated queue that restarts at 01
 * each day, displayed as "D{doctorId}-NN" (e.g. D3-05). Keep in sync with
 * frontend/src/lib/queueNumber.js.
 */

/**
 * @param {bigint|number|string} doctorId
 * @param {number|string} nomor
 */
export const formatQueueNumber = (doctorId, nomor) =>
  `D${doctorId}-${String(nomor).padStart(2, "0")}`;

/**
 * Next nomorAntrean for a doctor on a given day, across all of that doctor's
 * jadwal. Uses max+1 (not count+1) so it never reuses a number. The caller
 * must hold the per-doctor lock (lockDoctorQueue) inside the same
 * transaction, otherwise two concurrent bookings could read the same max.
 *
 * @param {{ antrean: { aggregate: Function } }} tx
 * @param {bigint} doctorId
 * @param {Date} tanggal
 */
export async function nextQueueNumber(tx, doctorId, tanggal) {
  const { _max } = await tx.antrean.aggregate({
    where: { doctorId, tanggal },
    _max: { nomorAntrean: true },
  });
  return (_max.nomorAntrean ?? 0) + 1;
}

/**
 * Serialises bookings for one doctor until the transaction ends, so the
 * number read + insert (and the kuota check) cannot interleave.
 *
 * @param {{ $executeRaw: Function }} tx
 * @param {bigint} doctorId
 */
export async function lockDoctorQueue(tx, doctorId) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BigInt(doctorId)})`;
}
