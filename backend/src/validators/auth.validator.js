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
