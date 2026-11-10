import { prisma } from "../config/prisma.js";

/**
 * Kolom yang aman dikirim ke client (tanpa hash password).
 * Dipilih eksplisit — tidak memakai select-all.
 */
const publicFields = {
  id: true,
  nama: true,
  email: true,
  noHp: true,
  role: true,
  clinicId: true,
  isActive: true,
  createdAt: true,
};

export const userRepository = {
  /**
   * Mengambil record lengkap termasuk hash password.
   * Hanya dipakai pada proses autentikasi — jangan kirim hasilnya ke client.
   *
   * @param {string} email
   */
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),

  /** @param {bigint} id */
  findPublicById: (id) =>
    prisma.user.findUnique({ where: { id }, select: publicFields }),

  /**
   * Record lengkap termasuk hash password, berdasarkan id. Hanya untuk
   * verifikasi password — jangan kirim hasilnya ke client.
   *
   * @param {bigint} id
   */
  findById: (id) => prisma.user.findUnique({ where: { id } }),

  /** @param {object} data */
  create: (data) => prisma.user.create({ data, select: publicFields }),

  /**
   * @param {bigint} id
   * @param {object} data
   */
  update: (id, data) =>
    prisma.user.update({ where: { id }, data, select: publicFields }),
};
