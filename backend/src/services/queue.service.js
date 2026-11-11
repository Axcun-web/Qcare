import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";
import {
  doctorAvgServiceMin,
  predictionService,
} from "./prediction.service.js";
import {
  formatQueueNumber,
  lockDoctorQueue,
  nextQueueNumber,
} from "../utils/queueNumber.js";
import {
  bookingDateError,
  estimateCallTime,
  isFutureVisit,
  transitionError,
} from "../utils/queueRules.js";

const STATUS_MESSAGES = {
  SEDANG_DIPANGGIL: (nomor) =>
    `Nomor antrean Anda (No. ${nomor}) sedang dipanggil, silakan menuju ruang dokter.`,
  SELESAI: (nomor) =>
    `Pelayanan untuk antrean No. ${nomor} telah selesai. Terima kasih.`,
  DILEWATI: (nomor) =>
    `Antrean No. ${nomor} dilewati karena tidak hadir saat dipanggil. Silakan hubungi petugas.`,
  DIBATALKAN: (nomor) => `Antrean No. ${nomor} telah dibatalkan.`,
};

const queueInclude = {
  doctor: { select: { id: true, nama: true, spesialisasi: true } },
  clinic: { select: { id: true, nama: true } },
  recordPasien: {
    select: {
      nama: true,
      tanggalLahir: true,
      jenisKelamin: true,
      tempatLahir: true,
      hubungan: true,
      user: { select: { email: true, noHp: true } },
    },
  },
  jadwal: { select: { jamMulai: true, jamSelesai: true } },
};
const startOfDay = (value = new Date()) =>
  new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
// WIB = UTC+7, no DST — used to bucket service_history.jam by local hour-of-day, not UTC.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const wibHour = (date) =>
  new Date(date.getTime() + WIB_OFFSET_MS).getUTCHours();
// getDay(): 0=Sunday..6=Saturday - matches the DAYS ordering used elsewhere
// (admin.controller.js, JadwalDokter) for the "hari" free-text column.
// Notifies every active PETUGAS at a clinic - used for staff-facing events
// (new booking, patient-initiated cancellation) as opposed to the
// patient-facing STATUS_MESSAGES notifications above.
async function notifyClinicStaff(tx, clinicId, pesan, antreanId) {
  const staff = await tx.user.findMany({
    where: { clinicId, role: "PETUGAS", isActive: true },
    select: { id: true },
  });
  if (staff.length === 0) return;
  await tx.notification.createMany({
    data: staff.map((s) => ({ userId: s.id, antreanId, pesan })),
  });
}

const HARI_NAMES = [
  "MINGGU",
  "SENIN",
  "SELASA",
  "RABU",
  "KAMIS",
  "JUMAT",
  "SABTU",
];
// Callers pass startOfDay() values (UTC midnight of the local date), so the
// UTC weekday is the local weekday regardless of the server's time zone.
const hariFromDate = (date) => HARI_NAMES[date.getUTCDay()];

async function validateDoctorSchedule(doctorId, jadwalId) {
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
  return { doctor, schedule };
}

async function createAntreanTransaction({
  patient,
  doctor,
  schedule,
  jadwalId,
  date,
  sumber,
}) {
  const result = await prisma.$transaction(async (tx) => {
    // Tabel 3.6 exc. 2: one active queue per patient, doctor and date. A
    // patient may hold bookings with other doctors or on other days.
    const existing = await tx.antrean.findFirst({
      where: {
        recordPasienId: patient.id,
        doctorId: doctor.id,
        tanggal: date,
        status: { in: ["MENUNGGU", "SEDANG_DIPANGGIL", "SEDANG_DILAYANI"] },
      },
    });
    if (existing)
      throw ApiError.conflict(
        "Pasien sudah memiliki antrean aktif untuk dokter dan tanggal ini.",
      );
    // Each doctor has an isolated daily queue (D{doctorId}-NN). The lock
    // serialises concurrent bookings for this doctor so the number read +
    // insert and the kuota check below cannot race.
    await lockDoctorQueue(tx, doctor.id);
    const nomorAntrean = await nextQueueNumber(tx, doctor.id, date);
    const countForQuota = await tx.antrean.count({
      where: { jadwalId, tanggal: date, status: { notIn: ["DIBATALKAN"] } },
    });
    if (countForQuota >= schedule.kuotaAntrean)
      throw ApiError.conflict("Kuota antrean sudah penuh");
    const entry = await tx.antrean.create({
      data: {
        recordPasienId: patient.id,
        doctorId: doctor.id,
        clinicId: doctor.clinicId,
        jadwalId,
        nomorAntrean,
        tanggal: date,
        sumber,
        // A walk-in is registered at the desk, so the patient is physically
        // here now. Online bookings get it later via recordArrival().
        timestampKedatangan: sumber === "WALK_IN" ? new Date() : null,
      },
      include: queueInclude,
    });
    if (sumber === "ONLINE") {
      await tx.notification.create({
        data: {
          userId: patient.userId,
          antreanId: entry.id,
          pesan: `Antrean No. ${formatQueueNumber(entry.doctorId, entry.nomorAntrean)} berhasil didaftarkan.`,
        },
      });
      await notifyClinicStaff(
        tx,
        doctor.clinicId,
        `Antrean baru No. ${formatQueueNumber(entry.doctorId, entry.nomorAntrean)} untuk ${doctor.nama} telah didaftarkan pasien.`,
        entry.id,
      );
    }
    return entry;
  });
  const estimates = await refreshPredictions(result);
  return {
    ...result,
    estimasiMenit: estimates.get(result.id.toString())?.estimasiMenit ?? null,
  };
}

/** PETUGAS may only act on queues of their own clinic; SUPERADMIN on any. */
async function assertStaffOwnsClinic(user, clinicId) {
  if (user.role !== "PETUGAS") return;
  const staff = await prisma.user.findUnique({
    where: { id: BigInt(user.id) },
    select: { clinicId: true },
  });
  if (!staff?.clinicId || staff.clinicId !== clinicId)
    throw ApiError.forbidden("Antrean bukan milik klinik Anda");
}

const ACTIVE_STATUSES = ["MENUNGGU", "SEDANG_DIPANGGIL", "SEDANG_DILAYANI"];

/**
 * Live queue position + wait estimate for one active antrean, shared by the
 * patient dashboard and "Antrean Saya". The estimate is the latest
 * PredictionHistory row (written by predictionService.refreshSession); if
 * none exists yet it falls back to patients ahead × the doctor's long-term
 * average service time (UC Lihat Estimasi Waktu, exception 1-2).
 *
 * @param {{ id: bigint, jadwalId: bigint, tanggal: Date, doctorId: bigint,
 *   nomorAntrean: number, status: string }} antrean
 */
async function liveQueueStatus(antrean) {
  // A booking for a later day has no session yet: no position or estimate.
  // The UI shows "Estimasi tersedia pada hari kunjungan" instead.
  if (isFutureVisit(antrean.tanggal, startOfDay())) {
    return {
      currentQueueNumber: "-",
      peopleAhead: null,
      estimatedWaitTime: null,
      estimatedCallTime: null,
      sumberEstimasi: null,
      isFutureVisit: true,
    };
  }
  const [currentlyServing, peopleAhead, latestPrediction, jadwal] =
    await Promise.all([
      prisma.antrean.findFirst({
        where: {
          jadwalId: antrean.jadwalId,
          tanggal: antrean.tanggal,
          status: { in: ["SEDANG_DILAYANI", "SEDANG_DIPANGGIL"] },
        },
        orderBy: { nomorAntrean: "desc" },
        select: { nomorAntrean: true },
      }),
      prisma.antrean.count({
        where: {
          jadwalId: antrean.jadwalId,
          tanggal: antrean.tanggal,
          status: "MENUNGGU",
          nomorAntrean: { lt: antrean.nomorAntrean },
        },
      }),
      prisma.predictionHistory.findFirst({
        where: { antreanId: antrean.id },
        orderBy: { waktuPrediksi: "desc" },
        select: {
          estimasiMenit: true,
          sumberEstimasi: true,
          waktuPrediksi: true,
        },
      }),
      prisma.jadwalPraktikDokter.findUnique({
        where: { id: antrean.jadwalId },
        select: { jamMulai: true },
      }),
    ]);

  let estimatedWaitTime = latestPrediction?.estimasiMenit;
  let sumberEstimasi = latestPrediction?.sumberEstimasi;
  if (latestPrediction === null) {
    // Same definition as the model input: the patient in service counts
    // as "ahead" of a waiting patient.
    const ahead =
      antrean.status === "MENUNGGU"
        ? peopleAhead + (currentlyServing ? 1 : 0)
        : 0;
    const { avg, hasHistory } = await doctorAvgServiceMin(antrean.doctorId);
    estimatedWaitTime = Math.round(ahead * avg);
    sumberEstimasi = hasHistory ? "HISTORICAL_AVG" : "DEFAULT";
  }

  // "Estimasi jam dipanggil" (Bab 1 §1.3). A stored prediction's minutes
  // count from when it was made; the fallback counts from now.
  const estimatedCallTime =
    estimatedWaitTime == null || !jadwal
      ? null
      : estimateCallTime({
          now: latestPrediction?.waktuPrediksi ?? new Date(),
          visitDate: antrean.tanggal,
          sessionStart: jadwal.jamMulai,
          waitMinutes: estimatedWaitTime,
        });

  return {
    currentQueueNumber: currentlyServing?.nomorAntrean ?? "-",
    peopleAhead,
    estimatedWaitTime,
    estimatedCallTime,
    sumberEstimasi,
    isFutureVisit: false,
  };
}

/**
 * Recomputes the wait estimate of every active patient in the entry's doctor
 * session. Runs outside the queue transaction because it calls the FastAPI
 * service over HTTP; a failure here must not undo the booking/status change
 * itself, so it is logged and an empty Map returned.
 */
async function refreshPredictions(entry) {
  // Predictions use the live session (who is being served now); a future
  // day has none, and logging a guess would skew the accuracy evaluation.
  if (isFutureVisit(entry.tanggal, startOfDay())) return new Map();
  try {
    return await predictionService.refreshSession({
      doctorId: entry.doctorId,
      jadwalId: entry.jadwalId,
      tanggal: entry.tanggal,
    });
  } catch (err) {
    logger.error("Gagal memperbarui estimasi waktu tunggu:", err);
    return new Map();
  }
}

export const queueService = {
  /**
   * Active (waiting, called or in service) queues from today on that match
   * `where`, e.g. { doctorId } or { jadwalId }. Used to warn before a doctor
   * is deactivated or a schedule changes while patients are booked
   * (Tabel 3.17, 3.18 exceptions).
   *
   * @param {object} where - extra Prisma filter on Antrean
   */
  countActiveFromToday(where) {
    return prisma.antrean.count({
      where: {
        ...where,
        tanggal: { gte: startOfDay() },
        status: { in: ACTIVE_STATUSES },
      },
    });
  },

  /**
   * Tabel 3.18 exception: a doctor with patients still booked from today on
   * cannot be deactivated; staff must finish or cancel those queues first.
   *
   * @param {bigint} doctorId
   */
  async assertDoctorHasNoActiveQueues(doctorId) {
    const active = await this.countActiveFromToday({ doctorId });
    if (active)
      throw ApiError.conflict(
        `Dokter masih memiliki ${active} antrean aktif. Selesaikan atau batalkan antrean tersebut sebelum menonaktifkan dokter.`,
      );
  },
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
    // Tabel 3.5: the patient picks a visit date (today .. today + 7) and a
    // practice slot that actually runs on that weekday.
    const dateError = bookingDateError(date, startOfDay());
    if (dateError) throw ApiError.badRequest(dateError);
    const { doctor, schedule } = await validateDoctorSchedule(
      doctorId,
      jadwalId,
    );
    if (schedule.hari !== hariFromDate(date))
      throw ApiError.badRequest(
        "Dokter tidak praktik pada tanggal yang dipilih",
      );

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

    return createAntreanTransaction({
      patient,
      doctor,
      schedule,
      jadwalId,
      date,
      sumber: "ONLINE",
    });
  },

  /**
   * Staff-initiated walk-in registration (Tabel ERD `sumber_antrean_enum.WALK_IN`).
   * A walk-in patient typically has no Qcare account of their own, and
   * `RecordPasien.userId` is a required FK - so the record is created under
   * the staff member's own account instead (same shape as the existing
   * "register for a family member" path in `create()` above), with
   * `hubungan: "Walk-in"` marking it as staff-entered rather than
   * self-registered. Does not support reusing an existing RecordPasien -
   * every walk-in call creates a fresh one.
   */
  async createWalkIn(staffUser, input) {
    const doctorId = BigInt(input.doctorId),
      jadwalId = BigInt(input.jadwalId),
      date = startOfDay();
    const { doctor, schedule } = await validateDoctorSchedule(
      doctorId,
      jadwalId,
    );
    // A walk-in has no date picker - it's always "right now" - so the chosen
    // schedule must actually run today, or nomorAntrean/kuota would be
    // counted against the wrong recurring slot.
    if (schedule.hari !== hariFromDate(date))
      throw ApiError.badRequest(
        "Jadwal yang dipilih tidak berlaku untuk hari ini",
      );

    if (staffUser.role === "PETUGAS") {
      const staff = await prisma.user.findUnique({
        where: { id: BigInt(staffUser.id) },
        select: { clinicId: true },
      });
      if (!staff?.clinicId)
        throw ApiError.badRequest("Petugas belum dihubungkan ke klinik");
      if (staff.clinicId !== doctor.clinicId)
        throw ApiError.forbidden("Dokter bukan bagian dari klinik Anda");
    }

    const { namaPasien, birthDate, gender, birthPlace } = input;
    if (!namaPasien || !birthDate || !gender)
      throw ApiError.badRequest("Data pasien belum lengkap");

    const patient = await prisma.recordPasien.create({
      data: {
        userId: BigInt(staffUser.id),
        nama: namaPasien,
        tanggalLahir: new Date(birthDate),
        tempatLahir: birthPlace || null,
        jenisKelamin: gender,
        hubungan: "Walk-in",
      },
    });

    return createAntreanTransaction({
      patient,
      doctor,
      schedule,
      jadwalId,
      date,
      sumber: "WALK_IN",
    });
  },
  /**
   * Tabel 3.16 (Petugas edits a queue): move a waiting queue to another
   * date. Same rules as booking (date window, doctor practises that day,
   * quota, no duplicate for the same patient, doctor and date); the queue
   * gets the next number of the new day. Online patients are notified.
   *
   * @param {{ id: string, role: string }} user - PETUGAS or SUPERADMIN
   * @param {string} queueId
   * @param {{ tanggal: string, jadwalId?: string|number }} input
   */
  async reschedule(user, queueId, input) {
    const entry = await prisma.antrean.findUnique({
      where: { id: BigInt(queueId) },
      include: { recordPasien: { select: { userId: true, nama: true } } },
    });
    if (!entry) throw ApiError.notFound("Antrean tidak ditemukan");
    await assertStaffOwnsClinic(user, entry.clinicId);
    if (entry.status !== "MENUNGGU")
      throw ApiError.badRequest(
        "Hanya antrean yang masih menunggu yang dapat dipindahkan tanggalnya",
      );

    if (!input?.tanggal) throw ApiError.badRequest("Tanggal baru wajib diisi");
    const date = startOfDay(new Date(input.tanggal));
    const dateError = bookingDateError(date, startOfDay());
    if (dateError) throw ApiError.badRequest(dateError);
    if (date.getTime() === entry.tanggal.getTime())
      throw ApiError.badRequest(
        "Tanggal baru sama dengan tanggal antrean saat ini",
      );

    const slots = await prisma.jadwalPraktikDokter.findMany({
      where: {
        doctorId: entry.doctorId,
        hari: hariFromDate(date),
        kuotaAntrean: { gt: 0 },
        ...(input.jadwalId ? { id: BigInt(input.jadwalId) } : {}),
      },
    });
    if (slots.length === 0)
      throw ApiError.badRequest(
        "Dokter tidak praktik pada tanggal yang dipilih",
      );
    if (slots.length > 1)
      throw ApiError.badRequest(
        "Dokter memiliki lebih dari satu jadwal pada hari itu; pilih jadwalnya",
      );
    const schedule = slots[0];

    const updated = await prisma.$transaction(async (tx) => {
      await lockDoctorQueue(tx, entry.doctorId);
      const duplicate = await tx.antrean.findFirst({
        where: {
          id: { not: entry.id },
          recordPasienId: entry.recordPasienId,
          doctorId: entry.doctorId,
          tanggal: date,
          status: { in: ACTIVE_STATUSES },
        },
      });
      if (duplicate)
        throw ApiError.conflict(
          "Pasien sudah memiliki antrean aktif untuk dokter ini pada tanggal tersebut",
        );
      const booked = await tx.antrean.count({
        where: {
          jadwalId: schedule.id,
          tanggal: date,
          status: { notIn: ["DIBATALKAN"] },
        },
      });
      if (booked >= schedule.kuotaAntrean)
        throw ApiError.conflict(
          "Kuota antrean pada tanggal tersebut sudah penuh",
        );
      const nomorAntrean = await nextQueueNumber(tx, entry.doctorId, date);
      const moved = await tx.antrean.update({
        where: { id: entry.id },
        data: {
          tanggal: date,
          jadwalId: schedule.id,
          nomorAntrean,
          // Arrival belongs to the visit day; record it again on the new day.
          timestampKedatangan: null,
        },
        include: queueInclude,
      });
      if (entry.sumber === "ONLINE") {
        const tanggalLabel = date.toLocaleDateString("id-ID", {
          timeZone: "UTC",
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        await tx.notification.create({
          data: {
            userId: entry.recordPasien.userId,
            antreanId: entry.id,
            pesan: `Antrean Anda dipindahkan ke ${tanggalLabel}. Nomor antrean baru: ${formatQueueNumber(entry.doctorId, nomorAntrean)}.`,
          },
        });
      }
      return moved;
    });

    // Both sessions changed: the old one lost a patient, the new one gained one.
    await refreshPredictions(entry);
    await refreshPredictions(updated);
    return updated;
  },

  async mine(userId) {
    const queues = await prisma.antrean.findMany({
      where: { recordPasien: { userId: BigInt(userId) } },
      include: queueInclude,
      orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
    });
    return Promise.all(
      queues.map(async (q) =>
        ACTIVE_STATUSES.includes(q.status)
          ? { ...q, ...(await liveQueueStatus(q)) }
          : q,
      ),
    );
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
  /**
   * Records that an ONLINE patient has physically arrived at the clinic
   * ("Hadir"). Arrival is what the thesis's historical log needs (wait =
   * arrival -> service start); walk-ins already get it at registration.
   */
  async recordArrival(user, queueId) {
    const entry = await prisma.antrean.findUnique({
      where: { id: BigInt(queueId) },
      select: {
        id: true,
        clinicId: true,
        status: true,
        timestampKedatangan: true,
      },
    });
    if (!entry) throw ApiError.notFound("Antrean tidak ditemukan");
    await assertStaffOwnsClinic(user, entry.clinicId);
    if (!["MENUNGGU", "SEDANG_DIPANGGIL"].includes(entry.status))
      throw ApiError.badRequest(
        "Kedatangan hanya dapat dicatat untuk antrean yang masih menunggu atau sedang dipanggil",
      );
    if (entry.timestampKedatangan)
      throw ApiError.conflict("Kedatangan pasien sudah tercatat");
    return prisma.antrean.update({
      where: { id: entry.id },
      data: { timestampKedatangan: new Date() },
      include: queueInclude,
    });
  },
  /**
   * @param {{ id: string, role: string }} user
   * @param {string} queueId
   * @param {string} status - target status
   * @param {string} [alasan] - required when staff skips (DILEWATI),
   *   Tabel 3.14 step 4 "alasan tidak hadir"
   */
  async changeStatus(user, queueId, status, alasan) {
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
    const alasanTidakHadir =
      status === "DILEWATI" ? String(alasan ?? "").trim() : null;
    if (status === "DILEWATI" && !alasanTidakHadir)
      throw ApiError.badRequest("Alasan tidak hadir wajib diisi");
    if (alasanTidakHadir && alasanTidakHadir.length > 255)
      throw ApiError.badRequest("Alasan tidak hadir maksimal 255 karakter");
    const entry = await prisma.antrean.findUnique({
      where: { id: BigInt(queueId) },
      include: {
        jadwal: { select: { hari: true } },
        recordPasien: { select: { userId: true, nama: true } },
      },
    });
    if (!entry) throw ApiError.notFound("Antrean tidak ditemukan");
    // A patient may only cancel their own queue. Answer 404 (not 403) so the
    // response does not reveal that another patient's queue exists.
    if (
      user.role === "PASIEN" &&
      entry.recordPasien.userId !== BigInt(user.id)
    ) {
      throw ApiError.notFound("Antrean tidak ditemukan");
    }
    await assertStaffOwnsClinic(user, entry.clinicId);
    const ruleError = transitionError({
      from: entry.status,
      to: status,
      role: user.role,
    });
    if (ruleError) throw ApiError.badRequest(ruleError);

    // Only write service_history on a genuine transition INTO SELESAI - guards
    // against a duplicate ServiceHistory insert (antreanId is @unique) if this
    // endpoint is ever called twice with the same target status.
    const isCompleting = status === "SELESAI" && entry.status !== "SELESAI";

    const changed = await prisma.$transaction(async (tx) => {
      const updated = await tx.antrean.update({
        where: { id: entry.id },
        data: {
          status,
          timestampMulaiLayanan:
            status === "SEDANG_DILAYANI" ? new Date() : undefined,
          // DILEWATI is final, so updatedAt of this write is the skip time.
          alasanTidakHadir: alasanTidakHadir ?? undefined,
        },
        include: queueInclude,
      });

      // [Alur 2] Simpan ServiceHistory
      // (durasi = jam Selesai - timestampMulaiLayanan).
      if (isCompleting) {
        const timestampSelesai = new Date();
        // Fallback for the anomalous case where a queue is marked SELESAI
        // without ever passing through SEDANG_DILAYANI (timestampMulaiLayanan
        // null) - records a 0-minute duration rather than failing the whole
        // status change, since the completion itself is still valid.
        const mulaiDilayani = entry.timestampMulaiLayanan ?? timestampSelesai;
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

      // Walk-ins have no real account of their own (RecordPasien.userId
      // points at the staff member who registered them - see createWalkIn),
      // so notifying "the patient" there would just message the staff about
      // their own action. Only ONLINE bookings get real notifications.
      const buildMessage = STATUS_MESSAGES[status];
      if (buildMessage && entry.sumber === "ONLINE") {
        await tx.notification.create({
          data: {
            userId: entry.recordPasien.userId,
            antreanId: entry.id,
            pesan: buildMessage(
              formatQueueNumber(entry.doctorId, entry.nomorAntrean),
            ),
          },
        });
      }

      // Staff only need to hear about a cancellation when the PATIENT
      // initiated it - if staff cancelled it themselves there's no one to
      // notify.
      if (
        status === "DIBATALKAN" &&
        user.role === "PASIEN" &&
        entry.sumber === "ONLINE"
      ) {
        await notifyClinicStaff(
          tx,
          entry.clinicId,
          `Antrean No. ${formatQueueNumber(entry.doctorId, entry.nomorAntrean)} (${entry.recordPasien.nama}) dibatalkan oleh pasien.`,
          entry.id,
        );
      }

      return updated;
    });
    // Every status change moves the queue (or, on SELESAI, updates the
    // doctor's rolling average), so re-estimate everyone still waiting.
    await refreshPredictions(entry);
    // [Alur 3] Kirim POST /train tanpa menunggu respons.
    // A completed queue adds a new ServiceHistory training row (thesis: the
    // model is retrained after "Selesai"). Not awaited: training takes ~45 s
    // and the prediction service batches it (>= N new rows) on its own.
    if (isCompleting) void predictionService.requestRetrain();
    return changed;
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
      },
      orderBy: { tanggal: "asc" },
    });

    let activeQueueData = null;

    if (activeAntrean) {
      activeQueueData = {
        id: activeAntrean.id.toString(),
        doctorId: activeAntrean.doctorId.toString(),
        nomorAntrean: activeAntrean.nomorAntrean,
        status: activeAntrean.status,
        tanggal: activeAntrean.tanggal,
        pasienNama: activeAntrean.recordPasien.nama,
        clinicNama: activeAntrean.clinic.nama,
        clinicAlamat: activeAntrean.clinic.alamat,
        // Gbr 3.72: clinic information on the home page.
        clinicJamOperasional: activeAntrean.clinic.jamOperasional,
        clinicJenisLayanan: activeAntrean.clinic.jenisLayanan,
        clinicNoTelp: activeAntrean.clinic.noTelp,
        doctorNama: activeAntrean.doctor.nama,
        doctorSpesialisasi: activeAntrean.doctor.spesialisasi,
        ...(await liveQueueStatus(activeAntrean)),
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
