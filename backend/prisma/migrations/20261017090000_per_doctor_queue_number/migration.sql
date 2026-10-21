-- Queue numbers are now per doctor per day (D{doctorId}-NN) instead of
-- clinic-wide. Existing rows were numbered clinic-wide, which is already
-- unique per doctor per day, so the new index cannot conflict with them.
DROP INDEX "antrean_jadwal_tanggal_nomor_key";

CREATE UNIQUE INDEX "antrean_doctor_tanggal_nomor_key" ON "antrean"("doctor_id", "tanggal", "nomor_antrean");
