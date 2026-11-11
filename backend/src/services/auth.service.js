import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { ApiError } from "../utils/ApiError.js";
import { userRepository } from "../repositories/user.repository.js";

const SALT_ROUNDS = 10;

/**
 * @param {{ id: bigint, email: string, role: string }} user
 * @returns {string} JWT
 */
function signToken(user) {
  return jwt.sign(
    { sub: user.id.toString(), email: user.email, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN },
  );
}

export const authService = {
  /**
   * Registrasi mandiri selalu menghasilkan akun ber-role PASIEN.
   * Akun PETUGAS dan SUPERADMIN dibuat oleh Super Admin melalui modul
   * Manage Akun Petugas (Tabel 3.19 skripsi), bukan lewat endpoint ini.
   *
   * @param {{ nama: string, email: string, password: string, noHp?: string }} input
   */
  async register({ nama, email, password, noHp }) {
    const existing = await userRepository.findByEmail(email);

    if (existing) {
      throw ApiError.conflict("Email sudah terdaftar");
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    return userRepository.create({
      nama,
      email,
      password: hashedPassword,
      noHp,
      role: "PASIEN",
    });
  },

  /**
   * @param {{ email: string, password: string }} input
   */
  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);

    // Pesan error disamakan untuk email tidak dikenal maupun password salah,
    // agar tidak membocorkan email mana yang terdaftar (user enumeration).
    if (!user) {
      throw ApiError.unauthorized("Email atau password salah");
    }

    if (!user.isActive) {
      throw ApiError.forbidden(
        "Akun tidak aktif. Silakan hubungi petugas klinik.",
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw ApiError.unauthorized("Email atau password salah");
    }

    return {
      token: signToken(user),
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
      },
    };
  },

  /** @param {string} userId - `sub` dari payload JWT. */
  async getProfile(userId) {
    const user = await userRepository.findPublicById(BigInt(userId));

    if (!user) {
      throw ApiError.notFound("Pengguna tidak ditemukan");
    }

    return user;
  },

  /**
   * Ubah Nama (Tabel 3.21) — berlaku untuk semua role.
   *
   * @param {string} userId - `sub` dari payload JWT.
   * @param {{ nama: string }} input
   */
  async updateName(userId, { nama }) {
    await this.getProfile(userId);
    return userRepository.update(BigInt(userId), { nama });
  },

  /**
   * Ubah Password (Tabel 3.22) — berlaku untuk semua role. Password lama
   * wajib benar; aturan password baru sama dengan registrasi.
   *
   * @param {string} userId - `sub` dari payload JWT.
   * @param {{ passwordLama: string, passwordBaru: string }} input
   */
  async changePassword(userId, { passwordLama, passwordBaru }) {
    const user = await userRepository.findById(BigInt(userId));

    if (!user) {
      throw ApiError.notFound("Pengguna tidak ditemukan");
    }

    const isPasswordValid = await bcrypt.compare(passwordLama, user.password);

    if (!isPasswordValid) {
      throw ApiError.badRequest("Password lama salah", {
        passwordLama: ["Password lama salah"],
      });
    }

    const hashedPassword = await bcrypt.hash(passwordBaru, SALT_ROUNDS);
    await userRepository.update(user.id, { password: hashedPassword });
  },
};
