/**
 * Seed data pengembangan Qcare.
 *
 * Tujuan: setiap kolaborator memperoleh satu akun demo per role (SUPERADMIN,
 * PETUGAS, PASIEN) dan data master minimum tanpa perlu menyiapkannya manual. Registrasi mandiri selalu
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

// Satu akun per role agar setiap alur (admin, petugas, pasien) bisa langsung
// dicoba. Kredensial petugas & pasien mengikuti akun demo yang sudah dipakai
// tim sebelumnya, sehingga DB lokal yang sudah memilikinya tetap konsisten.
const DEMO_USERS = [
  {
    nama: "Super Admin",
    email: "admin@gmail.com",
    password: "admin12345",
    role: "SUPERADMIN",
  },
  {
    nama: "Petugas Demo",
    email: "petugas@gmail.com",
    password: "petugas12345",
    role: "PETUGAS",
  },
  {
    nama: "Pasien Demo",
    email: "pasien@gmail.com",
    password: "pasien12345",
    role: "PASIEN",
  },
];

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
 * Membuat atau menegakkan satu akun demo.
 *
 * Password TIDAK ditimpa pada akun yang sudah ada, supaya developer yang sudah
 * memakai akun ini dengan password sendiri tidak kehilangan akses. Yang
 * ditegakkan hanya role, status aktif, dan (untuk PETUGAS) klinik.
 *
 * @param {{ nama: string, email: string, password: string, role: string }} demo
 * @param {bigint} clinicId - Hanya dipakai untuk PETUGAS.
 * @returns {Promise<{ id: bigint }>}
 */
async function seedUser(demo, clinicId) {
  const enforced = {
    role: demo.role,
    isActive: true,
    clinicId: demo.role === "PETUGAS" ? clinicId : null,
  };

  const existing = await prisma.user.findUnique({
    where: { email: demo.email },
    select: { id: true, role: true, isActive: true, clinicId: true },
  });

  if (existing !== null) {
    const upToDate =
      existing.role === enforced.role &&
      existing.isActive &&
      existing.clinicId === enforced.clinicId;

    if (upToDate) {
      console.log(`  user      : ${demo.email} sudah ${demo.role}, dilewati`);
      return existing;
    }

    await prisma.user.update({ where: { id: existing.id }, data: enforced });

    console.log(`  user      : ${demo.email} ditegakkan sebagai ${demo.role}`);
    return existing;
  }

  const created = await prisma.user.create({
    data: {
      nama: demo.nama,
      email: demo.email,
      password: await bcrypt.hash(demo.password, SALT_ROUNDS),
      ...enforced,
    },
    select: { id: true },
  });

  console.log(
    `  user      : ${demo.email} dibuat (password: ${demo.password})`,
  );
  return created;
}

/**
 * Data pasien "Diri sendiri" untuk akun pasien demo.
 *
 * Tanpa record ini pasien demo harus mengisi data diri dulu sebelum bisa
 * mengambil antrean.
 *
 * @param {bigint} userId
 * @returns {Promise<void>}
 */
async function seedRecordPasien(userId) {
  const exists = await prisma.recordPasien.findFirst({ where: { userId } });

  if (exists !== null) {
    console.log("  record    : data pasien demo sudah ada, dilewati");
    return;
  }

  await prisma.recordPasien.create({
    data: {
      userId,
      nama: "Pasien Demo",
      tanggalLahir: new Date("1995-01-01"),
      tempatLahir: "Jakarta",
      jenisKelamin: "Laki-laki",
      hubungan: "Diri sendiri",
    },
  });

  console.log("  record    : data pasien demo dibuat");
}

/**
 * @param {bigint} clinicId - Klinik tempat petugas demo ditugaskan.
 * @returns {Promise<void>}
 */
async function seedUsers(clinicId) {
  for (const demo of DEMO_USERS) {
    const user = await seedUser(demo, clinicId);

    if (demo.role === "PASIEN") {
      await seedRecordPasien(user.id);
    }
  }
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
 * @returns {Promise<bigint>} id klinik, dipakai untuk menugaskan petugas demo.
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

  return clinic.id;
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

  // Master data lebih dulu: petugas demo butuh id klinik.
  const clinicId = await seedMasterData();
  await seedUsers(clinicId);

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
