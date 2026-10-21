// Per-doctor queue number, e.g. D3-05. Mirrors
// backend/src/utils/queueNumber.js.
export const formatQueueNumber = (doctorId, nomor) =>
  `D${doctorId}-${String(nomor).padStart(2, "0")}`;
