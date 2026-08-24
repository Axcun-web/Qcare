import bcrypt from "bcryptjs";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";

const clinicSelect = { id: true, nama: true, alamat: true, jamOperasional: true, jenisLayanan: true, _count: { select: { doctors: true, users: true, antrean: true } } };
const publicUser = { id: true, nama: true, email: true, noHp: true, role: true, isActive: true, clinicId: true, clinic: { select: { nama: true } } };
const clinicData = (b) => ({ nama: b.nama, alamat: b.alamat, jamOperasional: b.jamOperasional, jenisLayanan: b.jenisLayanan });

export const adminController = {
  overview: asyncHandler(async (_q, res) => { 
    const [patients, staff, clinics, queues] = await Promise.all([prisma.user.count({ where: { role: "PASIEN" } }), prisma.user.count({ where: { role: "PETUGAS" } }), prisma.clinic.count(), prisma.antrean.groupBy({ by: ["status"], _count: true })]); 
    res.json({ success: true, data: { patients, staff, clinics, queues } }); 
  }),
  clinics: asyncHandler(async (_q, res) => res.json({ success: true, data: await prisma.clinic.findMany({ select: clinicSelect, orderBy: { nama: "asc" } }) })),
  
  clinic: asyncHandler(async (req, res) => { 
    const clinic = await prisma.clinic.findUnique({ 
      where: { id: BigInt(req.params.id) }, 
      select: { 
        ...clinicSelect, 
        doctors: { select: { id: true, nama: true, spesialisasi: true, isActive: true } }, 
        users: { where: { role: "PETUGAS" }, select: publicUser } 
      } 
    }); 
    if (!clinic) throw ApiError.notFound("Klinik tidak ditemukan"); 
    res.json({ success: true, data: clinic }); 
  }),

  createClinic: asyncHandler(async (req, res) => { 
    const data = clinicData(req.body); 
    if (Object.values(data).some((v) => !v)) throw ApiError.badRequest("Semua data klinik wajib diisi"); 
    res.status(201).json({ success: true, data: await prisma.clinic.create({ data, select: clinicSelect }) }); 
  }),
  updateClinic: asyncHandler(async (req, res) => res.json({ success: true, data: await prisma.clinic.update({ where: { id: BigInt(req.params.id) }, data: clinicData(req.body), select: clinicSelect }) })),
  
  deleteClinic: asyncHandler(async (req, res) => { 
    const id = BigInt(req.params.id); 
    if (await prisma.antrean.count({ where: { clinicId: id } })) throw ApiError.conflict("Klinik tidak dapat dihapus karena sudah memiliki riwayat antrean"); 
    await prisma.$transaction([
      prisma.user.updateMany({ where: { clinicId: id, role: "PETUGAS" }, data: { clinicId: null, isActive: false } }), 
      prisma.jadwalPraktikDokter.deleteMany({ where: { doctor: { clinicId: id } } }), // Can remove this if the table is deleted
      prisma.doctor.deleteMany({ where: { clinicId: id } }), 
      prisma.clinic.delete({ where: { id } })
    ]); 
    res.status(204).send(); 
  }),

  createDoctor: asyncHandler(async (req, res) => { 
    const { nama, spesialisasi } = req.body; 
    if (!nama || !spesialisasi) throw ApiError.badRequest("Data dokter wajib diisi"); 
    
    const doctor = await prisma.doctor.create({ 
      data: { clinicId: BigInt(req.params.id), nama, spesialisasi }, 
      select: { id: true, nama: true, spesialisasi: true, isActive: true } 
    }); 
    res.status(201).json({ success: true, data: doctor }); 
  }),

  updateDoctor: asyncHandler(async (req, res) => {
    const { nama, spesialisasi } = req.body;
    res.json({ success: true, data: await prisma.doctor.update({ 
      where: { id: BigInt(req.params.id) }, 
      data: { nama, spesialisasi } 
    })});
  }),

  deleteDoctor: asyncHandler(async (req, res) => {
    await prisma.jadwalPraktikDokter.deleteMany({ where: { doctorId: BigInt(req.params.id) } }); 
    await prisma.doctor.delete({ where: { id: BigInt(req.params.id) } });
    res.status(204).send();
  }),

  createStaff: asyncHandler(async (req, res) => { 
    const { nama, email, password, noHp } = req.body; 
    if (!nama || !email || !password) throw ApiError.badRequest("Nama, email, dan password wajib diisi"); 
    if (await prisma.user.findUnique({ where: { email } })) throw ApiError.conflict("Email sudah terdaftar"); 
    res.status(201).json({ success: true, data: await prisma.user.create({ data: { nama, email: email.toLowerCase(), password: await bcrypt.hash(password, 10), noHp, role: "PETUGAS", clinicId: BigInt(req.params.id) }, select: publicUser }) }); 
  }),
  
  users: asyncHandler(async (_q, res) => res.json({ success: true, data: await prisma.user.findMany({ select: publicUser, orderBy: { createdAt: "desc" } }) })),
  
  updateUser: asyncHandler(async (req, res) => { 
    const { nama, email, noHp, isActive, clinicId } = req.body, existing = await prisma.user.findUnique({ where: { id: BigInt(req.params.id) } }); 
    if (!existing) throw ApiError.notFound("Pengguna tidak ditemukan"); 
    const data = { ...(nama ? { nama } : {}), ...(email ? { email: email.toLowerCase() } : {}), ...(noHp !== undefined ? { noHp } : {}), ...(typeof isActive === "boolean" ? { isActive } : {}), ...(existing.role === "PETUGAS" && clinicId !== undefined ? { clinicId: clinicId ? BigInt(clinicId) : null } : {}) }; 
    res.json({ success: true, data: await prisma.user.update({ where: { id: existing.id }, data, select: publicUser }) }); 
  }),

  deleteUser: asyncHandler(async (req, res) => {
    await prisma.user.delete({ where: { id: BigInt(req.params.id) } });
    res.status(204).send();
  }),

  feedback: asyncHandler(async (_q, res) => res.json({ success: true, data: await prisma.feedback.findMany({ include: { user: { select: { nama: true, email: true } }, antrean: { include: { clinic: { select: { nama: true } } } } }, orderBy: { tanggalKirim: "desc" } }) })),
};