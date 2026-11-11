import { z } from "zod";

/** Minimum feedback length (Tabel 3.11 skripsi: masukan wajib, panjang minimum). */
export const FEEDBACK_MIN_LENGTH = 10;

/**
 * Skema Feedback — Use Case Description Kirim Feedback (Tabel 3.11 skripsi).
 * Rating is optional (1-5 stars); the text is required.
 */
export const feedbackSchema = z.object({
  isi: z
    .string({ required_error: "Isi feedback wajib diisi" })
    .trim()
    .min(
      FEEDBACK_MIN_LENGTH,
      `Isi feedback minimal ${FEEDBACK_MIN_LENGTH} karakter`,
    )
    .max(1000, "Isi feedback maksimal 1000 karakter"),
  rating: z
    .number()
    .int("Rating harus bilangan bulat")
    .min(1, "Rating minimal 1")
    .max(5, "Rating maksimal 5")
    .nullable()
    .optional(),
});
