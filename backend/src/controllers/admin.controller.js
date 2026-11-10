import bcrypt from "bcryptjs";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { queueService } from "../services/queue.service.js";
import { findOverlappingSlot } from "../utils/queueRules.js";
import { generateTempPassword } from "../utils/tempPassword.js";
import { parseUserListQuery } from "../utils/userListQuery.js";

const clinicSelect = {
  id: true,
  nama: true,
  alamat: true,
  jamOperasional: true,
  jenisLayanan: true,
  _count: { select: { doctors: true, users: true, antrean: true } },
};
const publicUser = {
  id: true,
  nama: true,
  email: true,
  noHp: true,
  role: true,
  isActive: true,
  clinicId: true,
  clinic: { select: { nama: true } },
};
const clinicData = (b) => ({
  nama: b.nama,
  alamat: b.alamat,
  jamOperasional: b.jamOperasional,
  jenisLayanan: b.jenisLayanan,
});

const DAYS = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];
const doctorSelect = {
  id: true,
  nama: true,
  spesialisasi: true,
  isActive: true,
  clinic: { select: { id: true, nama: true } },
  jadwalPraktik: true,
};
// "hari" adalah VarChar biasa (bukan enum DB), jadi urutan Senin->Minggu harus
// diterapkan di JS, bukan lewat orderBy Prisma (yang akan sort alfabetis).
const sortJadwal = (doctor) => ({
  ...doctor,
  jadwalPraktik: [...doctor.jadwalPraktik].sort(
    (a, b) => DAYS.indexOf(a.hari) - DAYS.indexOf(b.hari),
  ),
});
// Kolom jam_mulai / jam_selesai bertipe TIME; Prisma tetap menerima objek Date, hanya komponen waktunya yang dipakai (sama seperti prisma/seed.js).
const toTime = (hhmm) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const jadwalData = (b) => {
  if (!DAYS.includes(b.hari)) throw ApiError.badRequest("Hari tidak valid");
  if (
    !/^\d{2}:\d{2}$/.test(b.jamMulai ?? "") ||
    !/^\d{2}:\d{2}$/.test(b.jamSelesai ?? "")
  )
    throw ApiError.badRequest("Jam mulai/selesai wajib berformat HH:MM");
  if (b.jamMulai >= b.jamSelesai)
    throw ApiError.badRequest("Jam mulai harus lebih awal dari jam selesai");
  const kuotaAntrean = Number(b.kuotaAntrean);
  if (!Number.isInteger(kuotaAntrean) || kuotaAntrean < 1)
    throw ApiError.badRequest("Kuota antrean wajib bilangan bulat positif");
  return {
    hari: b.hari,
    jamMulai: toTime(b.jamMulai),
    jamSelesai: toTime(b.jamSelesai),
    kuotaAntrean,
  };
};

/**
 * The jadwal routes are open to PETUGAS as well as SUPERADMIN. A Petugas may
 * only manage doctors of their own clinic; Super Admin may manage any.
 *
 * @param {{ id: string, role: string }} user - req.user
 * @param {bigint} doctorClinicId
 */
async function assertCanManageClinic(user, doctorClinicId) {
  if (user.role !== "PETUGAS") return;
  const staff = await prisma.user.findUnique({
    where: { id: BigInt(user.id) },
    select: { clinicId: true },
  });
  if (!staff?.clinicId || staff.clinicId !== doctorClinicId)
    throw ApiError.forbidden("Dokter bukan bagian dari klinik Anda");
}

/** Loads a jadwal with its doctor's clinic, or throws 404. */
async function findJadwalWithClinic(id) {
  const jadwal = await prisma.jadwalPraktikDokter.findUnique({
    where: { id },
    include: { doctor: { select: { clinicId: true } } },
  });
  if (!jadwal) throw ApiError.notFound("Jadwal tidak ditemukan");
  return jadwal;
}

/**
 * Tabel 3.17 conflict check: the same doctor may not have two slots on the
 * same weekday whose hours overlap.
 *
 * @param {bigint} doctorId
 * @param {{ hari: string, jamMulai: Date, jamSelesai: Date }} slot
 * @param {bigint} [ignoreId] - the slot being edited
 */
async function assertNoOverlappingSlot(doctorId, slot, ignoreId) {
  const existing = await prisma.jadwalPraktikDokter.findMany({
    where: { doctorId, hari: slot.hari },
    select: { id: true, hari: true, jamMulai: true, jamSelesai: true },
  });
  if (findOverlappingSlot(slot, existing, ignoreId))
    throw ApiError.conflict(
      "Jadwal bentrok dengan jadwal lain dokter ini pada hari yang sama",
    );
}

export const adminController = {
  /**
   * Super Admin home (Gbr 3.83 skripsi): Total Klinik, Total Dokter, Total
   * Petugas, "Klinik teramai" and the latest feedback. "Teramai" = most
   * queues (not cancelled) in the last 30 days.
   */
  overview: asyncHandler(async (_q, res) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [clinics, doctors, staff, patients, busiest, latestFeedback] =
      await Promise.all([
        prisma.clinic.count(),
        prisma.doctor.count({ where: { isActive: true } }),
        prisma.user.count({ where: { role: "PETUGAS", isActive: true } }),
        prisma.user.count({ where: { role: "PASIEN", isActive: true } }),
        prisma.antrean.groupBy({
          by: ["clinicId"],
          where: { tanggal: { gte: since }, status: { not: "DIBATALKAN" } },
          _count: { _all: true },
          orderBy: { _count: { clinicId: "desc" } },
          take: 1,
        }),
        prisma.feedback.findMany({
          orderBy: { tanggalKirim: "desc" },
          take: 5,
          select: {
            id: true,
            rating: true,
            isi: true,
            tanggalKirim: true,
            user: { select: { nama: true } },
          },
        }),
      ]);
    const top = busiest[0];
    const busiestClinic = top
      ? {
          ...(await prisma.clinic.findUnique({
            where: { id: top.clinicId },
            select: { id: true, nama: true },
          })),
          antrean30Hari: top._count._all,
        }
      : null;
    res.json({
      success: true,
      data: {
        totalKlinik: clinics,
        totalDokter: doctors,
        totalPetugas: staff,
        totalPasien: patients,
        klinikTeramai: busiestClinic,
        feedbackTerbaru: latestFeedback,
      },
    });
  }),
  clinics: asyncHandler(async (_q, res) =>
    res.json({
      success: true,
      data: await prisma.clinic.findMany({
        select: clinicSelect,
        orderBy: { nama: "asc" },
      }),
    }),
  ),

  clinic: asyncHandler(async (req, res) => {
    const clinic = await prisma.clinic.findUnique({
      where: { id: BigInt(req.params.id) },
      select: {
        ...clinicSelect,
        doctors: {
          select: {
            id: true,
            nama: true,
            spesialisasi: true,
            isActive: true,
            jadwalPraktik: true,
          },
        },
        users: { where: { role: "PETUGAS" }, select: publicUser },
      },
    });
    if (!clinic) throw ApiError.notFound("Klinik tidak ditemukan");
    res.json({
      success: true,
      data: { ...clinic, doctors: clinic.doctors.map(sortJadwal) },
    });
  }),

  createClinic: asyncHandler(async (req, res) => {
    const data = clinicData(req.body);
    if (Object.values(data).some((v) => !v))
      throw ApiError.badRequest("Semua data klinik wajib diisi");
    res.status(201).json({
      success: true,
      data: await prisma.clinic.create({ data, select: clinicSelect }),
    });
  }),
  updateClinic: asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await prisma.clinic.update({
        where: { id: BigInt(req.params.id) },
        data: clinicData(req.body),
        select: clinicSelect,
      }),
    }),
  ),

  deleteClinic: asyncHandler(async (req, res) => {
    const id = BigInt(req.params.id);
    if (await prisma.antrean.count({ where: { clinicId: id } }))
      throw ApiError.conflict(
        "Klinik tidak dapat dihapus karena sudah memiliki riwayat antrean",
      );
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { clinicId: id, role: "PETUGAS" },
        data: { clinicId: null, isActive: false },
      }),
      prisma.jadwalPraktikDokter.deleteMany({
        where: { doctor: { clinicId: id } },
      }), // Can remove this if the table is deleted
      prisma.doctor.deleteMany({ where: { clinicId: id } }),
      prisma.clinic.delete({ where: { id } }),
    ]);
    res.status(204).send();
  }),

  createDoctor: asyncHandler(async (req, res) => {
    const { nama, spesialisasi } = req.body;
    if (!nama || !spesialisasi)
      throw ApiError.badRequest("Data dokter wajib diisi");

    const doctor = await prisma.doctor.create({
      data: { clinicId: BigInt(req.params.id), nama, spesialisasi },
      select: { id: true, nama: true, spesialisasi: true, isActive: true },
    });
    res.status(201).json({ success: true, data: doctor });
  }),

  updateDoctor: asyncHandler(async (req, res) => {
    const { nama, spesialisasi, isActive } = req.body;
    if (isActive === false)
      await queueService.assertDoctorHasNoActiveQueues(BigInt(req.params.id));
    res.json({
      success: true,
      data: await prisma.doctor.update({
        where: { id: BigInt(req.params.id) },
        data: { nama, spesialisasi, isActive },
      }),
    });
  }),

  // Soft delete: sets isActive: false rather than removing the row. A hard
  // delete would also need to remove jadwalPraktik first, which fails with a
  // foreign-key restrict error the moment any of those schedules has queue
  // history - soft delete sidesteps that entirely and keeps history intact.
  deleteDoctor: asyncHandler(async (req, res) => {
    await queueService.assertDoctorHasNoActiveQueues(BigInt(req.params.id));
    const doctor = await prisma.doctor.update({
      where: { id: BigInt(req.params.id) },
      data: { isActive: false },
      select: { id: true, nama: true, spesialisasi: true, isActive: true },
    });
    res.json({ success: true, data: doctor });
  }),

  doctors: asyncHandler(async (_q, res) => {
    const doctors = await prisma.doctor.findMany({
      select: doctorSelect,
      orderBy: [{ clinic: { nama: "asc" } }, { nama: "asc" }],
    });
    res.json({ success: true, data: doctors.map(sortJadwal) });
  }),

  createJadwal: asyncHandler(async (req, res) => {
    const doctor = await prisma.doctor.findUnique({
      where: { id: BigInt(req.params.id) },
    });
    if (!doctor) throw ApiError.notFound("Dokter tidak ditemukan");
    await assertCanManageClinic(req.user, doctor.clinicId);
    const data = jadwalData(req.body);
    await assertNoOverlappingSlot(doctor.id, data);
    res.status(201).json({
      success: true,
      data: await prisma.jadwalPraktikDokter.create({
        data: { doctorId: doctor.id, ...data },
      }),
    });
  }),

  updateJadwal: asyncHandler(async (req, res) => {
    const jadwal = await findJadwalWithClinic(BigInt(req.params.id));
    await assertCanManageClinic(req.user, jadwal.doctor.clinicId);
    const data = jadwalData(req.body);
    await assertNoOverlappingSlot(jadwal.doctorId, data, jadwal.id);
    // Moving a slot to another weekday would leave booked patients on a day
    // the doctor no longer practises.
    if (
      data.hari !== jadwal.hari &&
      (await queueService.countActiveFromToday({ jadwalId: jadwal.id }))
    )
      throw ApiError.conflict(
        "Hari jadwal tidak dapat diubah karena masih ada antrean aktif pada jadwal ini",
      );
    res.json({
      success: true,
      data: await prisma.jadwalPraktikDokter.update({
        where: { id: jadwal.id },
        data,
      }),
    });
  }),

  deleteJadwal: asyncHandler(async (req, res) => {
    const id = BigInt(req.params.id);
    const jadwal = await findJadwalWithClinic(id);
    await assertCanManageClinic(req.user, jadwal.doctor.clinicId);
    if (await prisma.antrean.count({ where: { jadwalId: id } }))
      throw ApiError.conflict(
        "Jadwal tidak dapat dihapus karena sudah memiliki riwayat antrean",
      );
    await prisma.jadwalPraktikDokter.delete({ where: { id } });
    res.status(204).send();
  }),

  createStaff: asyncHandler(async (req, res) => {
    const { nama, email, password, noHp } = req.body;
    if (!nama || !email || !password)
      throw ApiError.badRequest("Nama, email, dan password wajib diisi");
    if (await prisma.user.findUnique({ where: { email } }))
      throw ApiError.conflict("Email sudah terdaftar");
    res.status(201).json({
      success: true,
      data: await prisma.user.create({
        data: {
          nama,
          email: email.toLowerCase(),
          password: await bcrypt.hash(password, 10),
          noHp,
          role: "PETUGAS",
          clinicId: BigInt(req.params.id),
        },
        select: publicUser,
      }),
    });
  }),

  // Users tab: ?q=&role=&status=active|inactive&page=&pageSize=
  // data stays an array; meta carries the paging totals.
  users: asyncHandler(async (req, res) => {
    const { where, skip, take, page, pageSize } = parseUserListQuery(req.query);
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: publicUser,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);
    res.json({
      success: true,
      data: items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  }),

  updateUser: asyncHandler(async (req, res) => {
    const { nama, email, noHp, isActive, clinicId } = req.body,
      existing = await prisma.user.findUnique({
        where: { id: BigInt(req.params.id) },
      });
    if (!existing) throw ApiError.notFound("Pengguna tidak ditemukan");
    const data = {
      ...(nama ? { nama } : {}),
      ...(email ? { email: email.toLowerCase() } : {}),
      ...(noHp !== undefined ? { noHp } : {}),
      ...(typeof isActive === "boolean" ? { isActive } : {}),
      ...(existing.role === "PETUGAS" && clinicId !== undefined
        ? { clinicId: clinicId ? BigInt(clinicId) : null }
        : {}),
    };
    res.json({
      success: true,
      data: await prisma.user.update({
        where: { id: existing.id },
        data,
        select: publicUser,
      }),
    });
  }),

  // Soft delete: sets isActive: false rather than removing the row.
  // auth.service.js already blocks login for inactive accounts, so this
  // alone is enough to revoke access without losing history (feedback,
  // antrean, etc. that reference this user).
  /**
   * Tabel 3.19 "mereset password". Also the thesis's answer to a forgotten
   * password (there is no Lupa Password use case): the admin sets a random
   * temporary password, shown once, and the user changes it via Ubah
   * Password. The admin cannot reset their own account here.
   */
  resetUserPassword: asyncHandler(async (req, res) => {
    const id = BigInt(req.params.id);
    if (id === BigInt(req.user.id))
      throw ApiError.badRequest(
        "Gunakan menu Ubah Password untuk mengganti password Anda sendiri",
      );
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, nama: true },
    });
    if (!target) throw ApiError.notFound("Pengguna tidak ditemukan");

    const temporaryPassword = generateTempPassword();
    const password = await bcrypt.hash(temporaryPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { password } }),
      prisma.notification.create({
        data: {
          userId: id,
          pesan:
            "Password Anda telah direset oleh admin. Segera ganti password melalui menu Pengaturan > Ubah Kata Sandi.",
        },
      }),
    ]);
    res.json({
      success: true,
      message: `Password ${target.nama} berhasil direset`,
      data: { temporaryPassword },
    });
  }),

  deleteUser: asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: BigInt(req.params.id) },
      data: { isActive: false },
      select: publicUser,
    });
    res.json({ success: true, data: user });
  }),

  feedback: asyncHandler(async (_q, res) =>
    res.json({
      success: true,
      data: await prisma.feedback.findMany({
        include: {
          user: { select: { nama: true, email: true } },
          antrean: { include: { clinic: { select: { nama: true } } } },
        },
        orderBy: { tanggalKirim: "desc" },
      }),
    }),
  ),
};
