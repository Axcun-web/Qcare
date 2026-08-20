/**
 * Seed data pengembangan Qcare.
 *
 * Tujuan: setiap kolaborator memperoleh satu akun SUPERADMIN dan data master
 * minimum tanpa perlu menyiapkannya manual. Registrasi mandiri selalu
 * menghasilkan role PASIEN (lihat auth.service.js), dan akun SUPERADMIN hanya
 * bisa dibuat oleh SUPERADMIN lain — sehingga tanpa seed ini tidak ada cara
 * membuat SUPERADMIN pertama selain lewat SQL manual.
 *
 * Dijalankan otomatis oleh `prisma migrate reset`, atau manual via
 * `npm run prisma:seed`.
 *
 * KREDENSIAL DI BAWAH ADALAH KREDENSIAL PENGEMBANGAN LOKAL dan sengaja
 * di-commit agar setup tim seragam — mengikuti preseden docker-compose.yml.
 * JANGAN pakai untuk staging maupun produksi; lihat pengaman NODE_ENV di main().
 *
 * Catatan: skrip ini memakai console.* alih-alih src/utils/logger.js karena
 * dijalankan sebagai CLI di luar siklus hidup aplikasi — outputnya adalah
 * antarmuka untuk developer, bukan log aplikasi.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Sama dengan SALT_ROUNDS pada auth.service.js agar bentuk hash identik
// dengan hasil registrasi biasa.
const SALT_ROUNDS = 10;

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin12345";

const CLINIC_NAME = "Klinik Qcare Pusat";
const DOCTOR_NAME = "dr. Contoh Dokter";

/**
 * Kolom jam_mulai / jam_selesai bertipe TIME. Prisma tetap menerima objek
 * Date; hanya komponen waktunya yang dipakai.
 *
 * @param {string} hhmm - Jam dalam format "HH:MM".
 * @returns {Date}
 */
const toTime = (hhmm) => new Date(`1970-01-01T${hhmm}:00.000Z`);

/**
 * Membuat atau menegakkan akun SUPERADMIN.
 *
 * Password TIDAK ditimpa pada akun yang sudah ada, supaya developer yang sudah
 * memakai akun ini dengan password sendiri tidak kehilangan akses. Yang
 * ditegakkan hanya role dan status aktif.
 *
 * @returns {Promise<void>}
 */
async function seedSuperadmin() {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, role: true },
  });

  if (existing !== null) {
    if (existing.role === "SUPERADMIN") {
      console.log(`  user      : ${ADMIN_EMAIL} sudah SUPERADMIN, dilewati`);
      return;
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "SUPERADMIN", isActive: true },
    });

    console.log(`  user      : ${ADMIN_EMAIL} dipromosikan ke SUPERADMIN`);
    return;
  }

  await prisma.user.create({
    data: {
      nama: "Super Admin",
      email: ADMIN_EMAIL,
      password: await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS),
      role: "SUPERADMIN",
      isActive: true,
    },
  });

  console.log(
    `  user      : ${ADMIN_EMAIL} dibuat (password: ${ADMIN_PASSWORD})`,
  );
}

/**
 * Klinik + dokter + jadwal praktik.
 *
 * Tanpa ketiganya `/admin` tampil kosong dan `GET /api/queues/doctors` tidak
 * mengembalikan apa pun — endpoint itu memfilter `kuotaAntrean > 0`, sehingga
 * jadwal wajib ada agar modul antrean bisa dicoba.
 *
 * Clinic dan Doctor tidak punya kolom unique selain id, jadi idempotensi
 * dicapai lewat findFirst by nama, bukan upsert.
 *
 * @returns {Promise<void>}
 */
async function seedMasterData() {
  let clinic = await prisma.clinic.findFirst({ where: { nama: CLINIC_NAME } });

  if (clinic === null) {
    clinic = await prisma.clinic.create({
      data: {
        nama: CLINIC_NAME,
        alamat: "Jl. Contoh No. 1, Jakarta",
        jamOperasional: "08:00 - 16:00",
        jenisLayanan: "Poliklinik Umum, Poliklinik Gigi",
      },
    });
    console.log(`  clinic    : "${CLINIC_NAME}" dibuat`);
  } else {
    console.log(`  clinic    : "${CLINIC_NAME}" sudah ada, dilewati`);
  }

  let doctor = await prisma.doctor.findFirst({
    where: { nama: DOCTOR_NAME, clinicId: clinic.id },
  });

  if (doctor === null) {
    doctor = await prisma.doctor.create({
      data: {
        clinicId: clinic.id,
        nama: DOCTOR_NAME,
        spesialisasi: "Umum",
        isActive: true,
      },
    });
    console.log(`  doctor    : "${DOCTOR_NAME}" dibuat`);
  } else {
    console.log(`  doctor    : "${DOCTOR_NAME}" sudah ada, dilewati`);
  }

  const schedule = [
    { hari: "SENIN", jamMulai: "08:00", jamSelesai: "12:00", kuotaAntrean: 20 },
    {
      hari: "SELASA",
      jamMulai: "08:00",
      jamSelesai: "12:00",
      kuotaAntrean: 20,
    },
    { hari: "RABU", jamMulai: "13:00", jamSelesai: "16:00", kuotaAntrean: 15 },
  ];

  let created = 0;

  for (const slot of schedule) {
    const exists = await prisma.jadwalPraktikDokter.findFirst({
      where: { doctorId: doctor.id, hari: slot.hari },
    });

    if (exists === null) {
      await prisma.jadwalPraktikDokter.create({
        data: {
          doctorId: doctor.id,
          hari: slot.hari,
          jamMulai: toTime(slot.jamMulai),
          jamSelesai: toTime(slot.jamSelesai),
          kuotaAntrean: slot.kuotaAntrean,
        },
      });

      created += 1;
    }
  }

  console.log(
    created > 0
      ? `  jadwal    : ${created} jadwal praktik dibuat`
      : "  jadwal    : semua jadwal sudah ada, dilewati",
  );
}

/**
 * @returns {Promise<void>}
 */
async function main() {
  // Pengaman: seed memuat kredensial yang diketahui publik, jadi tidak boleh
  // pernah berjalan di produksi.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Seed dibatalkan: NODE_ENV=production. Seed hanya untuk pengembangan lokal.",
    );
  }

  console.log("Menjalankan seed pengembangan...");

  await seedSuperadmin();
  await seedMasterData();

  console.log("Seed selesai.");
}

try {
  await main();
} catch (error) {
  console.error("Seed gagal:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
