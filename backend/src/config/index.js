import "dotenv/config";
import { z } from "zod";

/**
 * Konfigurasi environment tervalidasi.
 * Seluruh modul WAJIB mengimpor `config` dari sini dan tidak membaca
 * `process.env` secara langsung, agar kesalahan konfigurasi terdeteksi
 * saat startup dan bukan saat runtime.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET minimal 32 karakter"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  PREDICTION_SERVICE_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Konfigurasi environment tidak valid:");
  console.error(parsed.error.flatten().fieldErrors);
  console.error("\nPastikan file .env sudah dibuat (lihat .env.example).");
  process.exit(1);
}

export const config = parsed.data;
export const isDevelopment = config.NODE_ENV === "development";
export const isProduction = config.NODE_ENV === "production";
