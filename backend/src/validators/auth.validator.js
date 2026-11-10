import { z } from "zod";

/**
 * Skema Registrasi — mengacu pada Use Case Description Registrasi
 * (Tabel 3.2 skripsi): nama, email, password, konfirmasi password, no. HP.
 */
export const registerSchema = z
  .object({
    nama: z.string().trim().min(3, "Nama minimal 3 karakter").max(150),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Format email tidak valid")
      .max(150),
    // Batas 72 karakter mengikuti panjang maksimum input bcrypt.
    password: z.string().min(8, "Password minimal 8 karakter").max(72),
    konfirmasiPassword: z.string(),
    noHp: z
      .string()
      .trim()
      .regex(/^[0-9+()\-\s]{8,20}$/, "Format nomor HP tidak valid")
      .optional(),
  })
  .refine((data) => data.password === data.konfirmasiPassword, {
    message: "Password dan konfirmasi password tidak sama",
    path: ["konfirmasiPassword"],
  });

/** Skema Login — Use Case Description Login (Tabel 3.3 skripsi). */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

/** Skema Ubah Nama — Use Case Description Ubah Nama (Tabel 3.21 skripsi). */
export const updateNameSchema = z
  .object({
    nama: z.string().trim().min(3, "Nama minimal 3 karakter").max(150),
    konfirmasiNama: z.string().trim(),
  })
  .refine((data) => data.nama === data.konfirmasiNama, {
    message: "Nama dan konfirmasi nama tidak sama",
    path: ["konfirmasiNama"],
  });

/**
 * Skema Ubah Password — Use Case Description Ubah Password (Tabel 3.22
 * skripsi). "Standar keamanan" = aturan yang sama dengan registrasi.
 */
export const changePasswordSchema = z
  .object({
    passwordLama: z.string().min(1, "Password lama wajib diisi"),
    passwordBaru: z.string().min(8, "Password minimal 8 karakter").max(72),
    konfirmasiPassword: z.string(),
  })
  .refine((data) => data.passwordBaru === data.konfirmasiPassword, {
    message: "Password baru dan konfirmasi password tidak sama",
    path: ["konfirmasiPassword"],
  })
  .refine((data) => data.passwordBaru !== data.passwordLama, {
    message: "Password baru harus berbeda dari password lama",
    path: ["passwordBaru"],
  });
