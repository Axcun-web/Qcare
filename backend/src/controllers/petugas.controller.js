import { asyncHandler } from "../middleware/asyncHandler.js";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";

const clinicSelect = {
  id: true,
  nama: true,
  alamat: true,
  jamOperasional: true,
  jenisLayanan: true,
  _count: { select: { doctors: true, users: true, antrean: true } },
};

const DAYS = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];
const sortJadwal = (doctor) => ({
  ...doctor,
  jadwalPraktik: [...doctor.jadwalPraktik].sort(
    (a, b) => DAYS.indexOf(a.hari) - DAYS.indexOf(b.hari),
  ),
});

export const petugasController = {
  myClinic: asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { clinicId: true },
    });
    if (!user.clinicId) throw ApiError.badRequest("Petugas tidak terhubung dengan klinik manapun");

    const clinic = await prisma.clinic.findUnique({
      where: { id: user.clinicId },
      include: {
        doctors: {
          include: {
            jadwalPraktik: true,
          },
        },
        users: {
          select: { id: true, nama: true, email: true, role: true },
          where: { role: "PETUGAS" },
        },
      },
    });

    if (!clinic) throw ApiError.notFound("Klinik tidak ditemukan");

    clinic.doctors = clinic.doctors.map(sortJadwal);
    res.json({ success: true, data: clinic });
  }),

  updateClinic: asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { clinicId: true },
    });
    if (!user.clinicId) throw ApiError.badRequest("Petugas tidak terhubung dengan klinik manapun");

    const data = {
      nama: req.body.nama,
      alamat: req.body.alamat,
      jamOperasional: req.body.jamOperasional,
      noTelp: req.body.noTelp,
      jenisLayanan: req.body.jenisLayanan,
    };
    const updated = await prisma.clinic.update({
      where: { id: user.clinicId },
      data,
    });
    res.json({ success: true, data: updated });
  }),

  createDoctor: asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { clinicId: true },
    });
    if (!user.clinicId) throw ApiError.badRequest("Petugas tidak terhubung dengan klinik manapun");

    const doctor = await prisma.doctor.create({
      data: {
        clinicId: user.clinicId,
        nama: req.body.nama,
        spesialisasi: req.body.spesialisasi,
      },
    });
    res.json({ success: true, data: doctor });
  }),

  updateDoctor: asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { clinicId: true },
    });
    if (!user.clinicId) throw ApiError.badRequest("Petugas tidak terhubung dengan klinik manapun");

    // Ensure the doctor belongs to the clinic
    const doc = await prisma.doctor.findUnique({ where: { id: BigInt(req.params.id) } });
    if (!doc || doc.clinicId !== user.clinicId) throw ApiError.notFound("Dokter tidak ditemukan");

    const doctor = await prisma.doctor.update({
      where: { id: doc.id },
      data: {
        nama: req.body.nama !== undefined ? req.body.nama : doc.nama,
        spesialisasi: req.body.spesialisasi !== undefined ? req.body.spesialisasi : doc.spesialisasi,
        isActive: req.body.isActive !== undefined ? req.body.isActive : doc.isActive,
      },
    });
    res.json({ success: true, data: doctor });
  }),

  deleteDoctor: asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { clinicId: true },
    });
    if (!user.clinicId) throw ApiError.badRequest("Petugas tidak terhubung dengan klinik manapun");

    const doc = await prisma.doctor.findUnique({ where: { id: BigInt(req.params.id) } });
    if (!doc || doc.clinicId !== user.clinicId) throw ApiError.notFound("Dokter tidak ditemukan");

    await prisma.doctor.delete({ where: { id: doc.id } });
    res.json({ success: true, data: null });
  }),
};
