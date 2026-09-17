import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";

const queueInclude = {
  doctor: { select: { id: true, nama: true, spesialisasi: true } },
  clinic: { select: { id: true, nama: true } },
  recordPasien: { select: { nama: true } },
  jadwal: { select: { jamMulai: true, jamSelesai: true } },
};
const startOfDay = (value = new Date()) =>
  new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
// WIB = UTC+7, no DST — used to bucket service_history.jam by local hour-of-day, not UTC.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const wibHour = (date) =>
  new Date(date.getTime() + WIB_OFFSET_MS).getUTCHours();

export const queueService = {
  async listDoctors() {
    return prisma.doctor.findMany({
      where: { isActive: true },
      include: {
        clinic: { select: { id: true, nama: true, alamat: true } },
        jadwalPraktik: {
          where: { kuotaAntrean: { gt: 0 } },
          select: {
            id: true,
            hari: true,
            jamMulai: true,
            jamSelesai: true,
            kuotaAntrean: true,
          },
        },
      },
      orderBy: { nama: "asc" },
    });
  },
  async create(userId, input) {
    const doctorId = BigInt(input.doctorId),
      jadwalId = BigInt(input.jadwalId),
      date = startOfDay(input.tanggal ? new Date(input.tanggal) : new Date());
    const [doctor, schedule] = await Promise.all([
      prisma.doctor.findUnique({ where: { id: doctorId } }),
      prisma.jadwalPraktikDokter.findUnique({ where: { id: jadwalId } }),
    ]);
    if (
      !doctor ||
      !doctor.isActive ||
      !schedule ||
      schedule.doctorId !== doctorId
    )
      throw ApiError.notFound("Dokter atau jadwal tidak ditemukan");

    let patient;
    const hubungan =
      input.registerFor === "self" ? "Diri sendiri" : "Orang Lain";
    const namaPasien = input.name || input.namaPasien;

    if (input.patientId) {
      patient = await prisma.recordPasien.update({
        where: { id: BigInt(input.patientId), userId: BigInt(userId) },
        data: {
          nama: namaPasien,
          tanggalLahir: new Date(input.birthDate),
          tempatLahir: input.birthPlace || null,
          jenisKelamin: input.gender,
          hubungan,
        },
      });
    } else {
      if (!namaPasien || !input.birthDate || !input.gender)
        throw ApiError.badRequest("Data pasien belum lengkap");
      patient = await prisma.recordPasien.create({
        data: {
          userId: BigInt(userId),
          nama: namaPasien,
          tanggalLahir: new Date(input.birthDate),
          tempatLahir: input.birthPlace || null,
          jenisKelamin: input.gender,
          hubungan,
        },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.antrean.findFirst({
        where: {
          recordPasienId: patient.id,
          status: { in: ["MENUNGGU", "SEDANG_DIPANGGIL", "SEDANG_DILAYANI"] },
        },
      });
      if (existing)
        throw ApiError.conflict(
          "Pasien sudah memiliki antrean aktif. Silakan selesaikan atau batalkan terlebih dahulu.",
        );
      const countForNumber = await tx.antrean.count({
        where: { clinicId: doctor.clinicId, tanggal: date },
      });
      const countForQuota = await tx.antrean.count({
        where: { jadwalId, tanggal: date, status: { notIn: ["DIBATALKAN"] } },
      });
      if (countForQuota >= schedule.kuotaAntrean)
        throw ApiError.conflict("Kuota antrean sudah penuh");
      const entry = await tx.antrean.create({
        data: {
          recordPasienId: patient.id,
          doctorId,
          clinicId: doctor.clinicId,
          jadwalId,
          nomorAntrean: countForNumber + 1,
          tanggal: date,
          sumber: "ONLINE",
        },
        include: queueInclude,
      });
      await tx.predictionHistory.create({
        data: {
          antreanId: entry.id,
          doctorId,
          tanggal: date,
          estimasiDurasiAntrean: 10,
          estimasiMenit: countForQuota * 10,
          sumberEstimasi: "DEFAULT",
        },
      });
      return entry;
    });
    return { ...result, estimasiMenit: (result.nomorAntrean - 1) * 10 };
  },
  async mine(userId) {
    const date = startOfDay();
    return prisma.antrean.findMany({
      where: { recordPasien: { userId: BigInt(userId) } },
      include: queueInclude,
      orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
    });
  },
  async getPatients(userId) {
    return prisma.recordPasien.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: "asc" },
    });
  },
  async staffQueue(user, date = startOfDay()) {
    const staff = await prisma.user.findUnique({
      where: { id: BigInt(user.id) },
      select: { clinicId: true },
    });
    if (user.role === "PETUGAS" && !staff?.clinicId)
      throw ApiError.badRequest("Petugas belum dihubungkan ke klinik");
    return prisma.antrean.findMany({
      where: {
        ...(user.role === "PETUGAS" ? { clinicId: staff.clinicId } : {}),
        tanggal: startOfDay(new Date(date)),
      },
      include: queueInclude,
      orderBy: [{ status: "asc" }, { nomorAntrean: "asc" }],
    });
  },
  async changeStatus(user, queueId, status) {
    const allowed = [
      "SEDANG_DIPANGGIL",
      "SEDANG_DILAYANI",
      "SELESAI",
      "DILEWATI",
      "DIBATALKAN",
    ];
    if (!allowed.includes(status))
      throw ApiError.badRequest("Status antrean tidak valid");
    if (user.role === "PASIEN" && status !== "DIBATALKAN") {
      throw ApiError.forbidden("Pasien hanya dapat membatalkan antrean");
    }
    const entry = await prisma.antrean.findUnique({
      where: { id: BigInt(queueId) },
      include: { jadwal: { select: { hari: true } } },
    });
    if (!entry) throw ApiError.notFound("Antrean tidak ditemukan");
    if (user.role === "PETUGAS") {
      const staff = await prisma.user.findUnique({
        where: { id: BigInt(user.id) },
        select: { clinicId: true },
      });
      if (!staff?.clinicId || staff.clinicId !== entry.clinicId)
        throw ApiError.forbidden("Antrean bukan milik klinik Anda");
    }

    // Only write service_history on a genuine transition INTO SELESAI - guards
    // against a duplicate ServiceHistory insert (antreanId is @unique) if this
    // endpoint is ever called twice with the same target status.
    const isCompleting = status === "SELESAI" && entry.status !== "SELESAI";

    return prisma.$transaction(async (tx) => {
      const updated = await tx.antrean.update({
        where: { id: entry.id },
        data: {
          status,
          timestampKedatangan:
            status === "SEDANG_DILAYANI" ? new Date() : undefined,
        },
        include: queueInclude,
      });

      if (isCompleting) {
        const timestampSelesai = new Date();
        // Fallback for the anomalous case where a queue is marked SELESAI
        // without ever passing through SEDANG_DILAYANI (timestampKedatangan
        // null) - records a 0-minute duration rather than failing the whole
        // status change, since the completion itself is still valid.
        const mulaiDilayani = entry.timestampKedatangan ?? timestampSelesai;
        const durasiPelayanan = Math.max(
          0,
          Math.round((timestampSelesai - mulaiDilayani) / 60000),
        );
        await tx.serviceHistory.create({
          data: {
            antreanId: entry.id,
            doctorId: entry.doctorId,
            hari: entry.jadwal.hari,
            jam: wibHour(mulaiDilayani),
            timestampSelesai,
            durasiPelayanan,
          },
        });
      }

      return updated;
    });
  },
  async getPatientDashboard(userId) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { id: true, nama: true, email: true },
    });

    const patientRecords = await prisma.recordPasien.findMany({
      where: { userId: BigInt(userId) },
      select: { id: true },
    });

    const recordIds = patientRecords.map((r) => r.id);

    const activeAntrean = await prisma.antrean.findFirst({
      where: {
        recordPasienId: { in: recordIds },
        status: { in: ["MENUNGGU", "SEDANG_DIPANGGIL", "SEDANG_DILAYANI"] },
      },
      include: {
        clinic: true,
        doctor: true,
        recordPasien: true,
        predictionHistory: {
          orderBy: { waktuPrediksi: "desc" },
          take: 1,
        },
      },
      orderBy: { tanggal: "asc" },
    });

    let activeQueueData = null;

    if (activeAntrean) {
      const currentlyServing = await prisma.antrean.findFirst({
        where: {
          jadwalId: activeAntrean.jadwalId,
          tanggal: activeAntrean.tanggal,
          status: { in: ["SEDANG_DILAYANI", "SEDANG_DIPANGGIL"] },
        },
        orderBy: { nomorAntrean: "desc" },
      });

      const peopleAhead = await prisma.antrean.count({
        where: {
          jadwalId: activeAntrean.jadwalId,
          tanggal: activeAntrean.tanggal,
          status: "MENUNGGU",
          nomorAntrean: { lt: activeAntrean.nomorAntrean },
        },
      });

      const estimatedWaitTime =
        activeAntrean.predictionHistory[0]?.estimasiMenit ?? peopleAhead * 15;

      activeQueueData = {
        id: activeAntrean.id.toString(),
        nomorAntrean: activeAntrean.nomorAntrean,
        status: activeAntrean.status,
        tanggal: activeAntrean.tanggal,
        pasienNama: activeAntrean.recordPasien.nama,
        clinicNama: activeAntrean.clinic.nama,
        clinicAlamat: activeAntrean.clinic.alamat,
        doctorNama: activeAntrean.doctor.nama,
        doctorSpesialisasi: activeAntrean.doctor.spesialisasi,
        currentQueueNumber: currentlyServing
          ? currentlyServing.nomorAntrean
          : "-",
        peopleAhead,
        estimatedWaitTime,
      };
    }

    const historyAntrean = await prisma.antrean.findMany({
      where: {
        recordPasienId: { in: recordIds },
        status: { in: ["SELESAI", "DILEWATI", "DIBATALKAN"] },
      },
      include: {
        clinic: true,
        doctor: true,
      },
      orderBy: { tanggal: "desc" },
      take: 3,
    });

    const historyData = historyAntrean.map((item) => ({
      id: item.id.toString(),
      clinicNama: item.clinic.nama,
      doctorNama: item.doctor.nama,
      tanggal: item.tanggal,
      status: item.status,
    }));

    return {
      user: {
        id: user?.id.toString(),
        nama: user?.nama,
        email: user?.email,
      },
      activeQueue: activeQueueData,
      history: historyData,
    };
  },
};
