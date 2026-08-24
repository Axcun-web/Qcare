import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";

const queueInclude = { doctor: { select: { id: true, nama: true, spesialisasi: true } }, clinic: { select: { id: true, nama: true } }, recordPasien: { select: { nama: true } }, jadwal: { select: { jamMulai: true, jamSelesai: true } } };
const startOfDay = (value = new Date()) => new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));

export const queueService = {
  async listDoctors() { return prisma.doctor.findMany({ where: { isActive: true }, include: { clinic: { select: { nama: true } }, jadwalPraktik: { where: { kuotaAntrean: { gt: 0 } }, select: { id: true, hari: true, jamMulai: true, jamSelesai: true, kuotaAntrean: true } } }, orderBy: { nama: "asc" } }); },
  async create(userId, input) {
    const doctorId = BigInt(input.doctorId), jadwalId = BigInt(input.jadwalId), date = startOfDay(input.tanggal ? new Date(input.tanggal) : new Date());
    const [doctor, schedule] = await Promise.all([prisma.doctor.findUnique({ where: { id: doctorId } }), prisma.jadwalPraktikDokter.findUnique({ where: { id: jadwalId } })]);
    if (!doctor || !doctor.isActive || !schedule || schedule.doctorId !== doctorId) throw ApiError.notFound("Dokter atau jadwal tidak ditemukan");
    let patient = await prisma.recordPasien.findFirst({ where: { userId: BigInt(userId), nama: input.namaPasien ?? undefined } });
    if (!patient) {
      if (!input.namaPasien || !input.tanggalLahir || !input.jenisKelamin) throw ApiError.badRequest("Data pasien belum lengkap");
      patient = await prisma.recordPasien.create({ data: { userId: BigInt(userId), nama: input.namaPasien, tanggalLahir: new Date(input.tanggalLahir), jenisKelamin: input.jenisKelamin, hubungan: input.hubungan ?? "Diri sendiri" } });
    }
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.antrean.findFirst({ where: { recordPasienId: patient.id, jadwalId, tanggal: date, status: { in: ["MENUNGGU", "SEDANG_DIPANGGIL", "SEDANG_DILAYANI"] } } });
      if (existing) throw ApiError.conflict("Pasien sudah memiliki antrean aktif pada jadwal ini");
      const count = await tx.antrean.count({ where: { jadwalId, tanggal: date, status: { notIn: ["DIBATALKAN"] } } });
      if (count >= schedule.kuotaAntrean) throw ApiError.conflict("Kuota antrean sudah penuh");
      const entry = await tx.antrean.create({ data: { recordPasienId: patient.id, doctorId, clinicId: doctor.clinicId, jadwalId, nomorAntrean: count + 1, tanggal: date, sumber: "ONLINE" }, include: queueInclude });
      await tx.predictionHistory.create({ data: { antreanId: entry.id, doctorId, tanggal: date, estimasiDurasiAntrean: 10, estimasiMenit: count * 10, sumberEstimasi: "DEFAULT" } });
      return entry;
    });
    return { ...result, estimasiMenit: (result.nomorAntrean - 1) * 10 };
  },
  async mine(userId) { const date = startOfDay(); return prisma.antrean.findMany({ where: { recordPasien: { userId: BigInt(userId) } }, include: queueInclude, orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }] }); },
  async staffQueue(user, date = startOfDay()) { const staff = await prisma.user.findUnique({ where: { id: BigInt(user.id) }, select: { clinicId: true } }); if (user.role === "PETUGAS" && !staff?.clinicId) throw ApiError.badRequest("Petugas belum dihubungkan ke klinik"); return prisma.antrean.findMany({ where: { ...(user.role === "PETUGAS" ? { clinicId: staff.clinicId } : {}), tanggal: startOfDay(new Date(date)) }, include: queueInclude, orderBy: [{ status: "asc" }, { nomorAntrean: "asc" }] }); },
  async changeStatus(user, queueId, status) { const allowed = ["SEDANG_DIPANGGIL", "SEDANG_DILAYANI", "SELESAI", "DILEWATI", "DIBATALKAN"]; if (!allowed.includes(status)) throw ApiError.badRequest("Status antrean tidak valid"); const entry = await prisma.antrean.findUnique({ where: { id: BigInt(queueId) } }); if (!entry) throw ApiError.notFound("Antrean tidak ditemukan"); if (user.role === "PETUGAS") { const staff = await prisma.user.findUnique({ where: { id: BigInt(user.id) }, select: { clinicId: true } }); if (!staff?.clinicId || staff.clinicId !== entry.clinicId) throw ApiError.forbidden("Antrean bukan milik klinik Anda"); } return prisma.antrean.update({ where: { id: entry.id }, data: { status, timestampKedatangan: status === "SEDANG_DILAYANI" ? new Date() : undefined }, include: queueInclude }); },
};
