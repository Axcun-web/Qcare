-- CreateEnum
CREATE TYPE "role_enum" AS ENUM ('PASIEN', 'PETUGAS', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "status_antrean_enum" AS ENUM ('MENUNGGU', 'SEDANG_DIPANGGIL', 'SEDANG_DILAYANI', 'SELESAI', 'DILEWATI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "sumber_antrean_enum" AS ENUM ('ONLINE', 'WALK_IN');

-- CreateTable
CREATE TABLE "clinic" (
    "id" BIGSERIAL NOT NULL,
    "nama" VARCHAR(150) NOT NULL,
    "alamat" VARCHAR(255) NOT NULL,
    "jam_operasional" VARCHAR(100) NOT NULL,
    "jenis_layanan" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" BIGSERIAL NOT NULL,
    "nama" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "no_hp" VARCHAR(20),
    "role" "role_enum" NOT NULL DEFAULT 'PASIEN',
    "clinic_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor" (
    "id" BIGSERIAL NOT NULL,
    "clinic_id" BIGINT NOT NULL,
    "nama" VARCHAR(150) NOT NULL,
    "spesialisasi" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_pasien" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "nama" VARCHAR(150) NOT NULL,
    "tanggal_lahir" DATE NOT NULL,
    "jenis_kelamin" VARCHAR(20) NOT NULL,
    "hubungan" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "record_pasien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_praktik_dokter" (
    "id" BIGSERIAL NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "hari" VARCHAR(10) NOT NULL,
    "jam_mulai" TIME NOT NULL,
    "jam_selesai" TIME NOT NULL,
    "kuota_antrean" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "jadwal_praktik_dokter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antrean" (
    "id" BIGSERIAL NOT NULL,
    "record_pasien_id" BIGINT NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "clinic_id" BIGINT NOT NULL,
    "jadwal_id" BIGINT NOT NULL,
    "nomor_antrean" INTEGER NOT NULL,
    "status" "status_antrean_enum" NOT NULL DEFAULT 'MENUNGGU',
    "sumber" "sumber_antrean_enum" NOT NULL DEFAULT 'ONLINE',
    "tanggal" DATE NOT NULL,
    "timestamp_kedatangan" TIMESTAMPTZ,
    "alasan_tidak_hadir" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "antrean_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_history" (
    "id" BIGSERIAL NOT NULL,
    "antrean_id" BIGINT NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "hari" VARCHAR(10) NOT NULL,
    "jam" INTEGER NOT NULL,
    "timestamp_selesai" TIMESTAMPTZ NOT NULL,
    "durasi_pelayanan" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_history" (
    "id" BIGSERIAL NOT NULL,
    "antrean_id" BIGINT NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "tanggal" DATE NOT NULL,
    "estimasi_durasi_antrean" INTEGER NOT NULL,
    "estimasi_menit" INTEGER NOT NULL,
    "sumber_estimasi" VARCHAR(30) NOT NULL,
    "waktu_prediksi" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "antrean_id" BIGINT,
    "rating" INTEGER,
    "isi" TEXT NOT NULL,
    "tanggal_kirim" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "antrean_id" BIGINT,
    "pesan" TEXT NOT NULL,
    "sudah_dibaca" BOOLEAN NOT NULL DEFAULT false,
    "waktu_kirim" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_clinic_id_idx" ON "user"("clinic_id");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE INDEX "doctor_clinic_id_idx" ON "doctor"("clinic_id");

-- CreateIndex
CREATE INDEX "record_pasien_user_id_idx" ON "record_pasien"("user_id");

-- CreateIndex
CREATE INDEX "jadwal_praktik_dokter_doctor_id_idx" ON "jadwal_praktik_dokter"("doctor_id");

-- CreateIndex
CREATE INDEX "antrean_tanggal_status_idx" ON "antrean"("tanggal", "status");

-- CreateIndex
CREATE INDEX "antrean_doctor_id_tanggal_idx" ON "antrean"("doctor_id", "tanggal");

-- CreateIndex
CREATE INDEX "antrean_record_pasien_id_idx" ON "antrean"("record_pasien_id");

-- CreateIndex
CREATE INDEX "antrean_clinic_id_idx" ON "antrean"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "antrean_jadwal_tanggal_nomor_key" ON "antrean"("jadwal_id", "tanggal", "nomor_antrean");

-- CreateIndex
CREATE UNIQUE INDEX "service_history_antrean_id_key" ON "service_history"("antrean_id");

-- CreateIndex
CREATE INDEX "service_history_doctor_id_hari_jam_idx" ON "service_history"("doctor_id", "hari", "jam");

-- CreateIndex
CREATE INDEX "prediction_history_antrean_id_idx" ON "prediction_history"("antrean_id");

-- CreateIndex
CREATE INDEX "prediction_history_doctor_id_tanggal_idx" ON "prediction_history"("doctor_id", "tanggal");

-- CreateIndex
CREATE INDEX "feedback_user_id_idx" ON "feedback"("user_id");

-- CreateIndex
CREATE INDEX "feedback_antrean_id_idx" ON "feedback"("antrean_id");

-- CreateIndex
CREATE INDEX "notification_user_id_sudah_dibaca_idx" ON "notification"("user_id", "sudah_dibaca");

-- CreateIndex
CREATE INDEX "notification_antrean_id_idx" ON "notification"("antrean_id");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor" ADD CONSTRAINT "doctor_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_pasien" ADD CONSTRAINT "record_pasien_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_praktik_dokter" ADD CONSTRAINT "jadwal_praktik_dokter_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antrean" ADD CONSTRAINT "antrean_record_pasien_id_fkey" FOREIGN KEY ("record_pasien_id") REFERENCES "record_pasien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antrean" ADD CONSTRAINT "antrean_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antrean" ADD CONSTRAINT "antrean_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antrean" ADD CONSTRAINT "antrean_jadwal_id_fkey" FOREIGN KEY ("jadwal_id") REFERENCES "jadwal_praktik_dokter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_history" ADD CONSTRAINT "service_history_antrean_id_fkey" FOREIGN KEY ("antrean_id") REFERENCES "antrean"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_history" ADD CONSTRAINT "service_history_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_history" ADD CONSTRAINT "prediction_history_antrean_id_fkey" FOREIGN KEY ("antrean_id") REFERENCES "antrean"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_history" ADD CONSTRAINT "prediction_history_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_antrean_id_fkey" FOREIGN KEY ("antrean_id") REFERENCES "antrean"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_antrean_id_fkey" FOREIGN KEY ("antrean_id") REFERENCES "antrean"("id") ON DELETE SET NULL ON UPDATE CASCADE;
