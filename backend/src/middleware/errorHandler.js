import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";
import { isDevelopment } from "../config/index.js";

/** Menangkap request ke endpoint yang tidak terdaftar. */
export function notFoundHandler(req, res, next) {
  next(
    ApiError.notFound(
      `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
    ),
  );
}

/**
 * Error handler terpusat. WAJIB terdaftar paling akhir pada app.js.
 */
export function errorHandler(err, req, res, _next) {
  let statusCode = 500;
  let message = "Terjadi kesalahan pada server";
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    message = "Validasi data gagal";
    details = err.flatten().fieldErrors;
  } else if (err?.code === "P2002") {
    // Prisma: pelanggaran unique constraint
    statusCode = 409;
    message = "Data sudah terdaftar";
    details = { field: err.meta?.target };
  } else if (err?.code === "P2025") {
    // Prisma: record yang dituju tidak ditemukan
    statusCode = 404;
    message = "Data tidak ditemukan";
  }

  if (statusCode >= 500) {
    logger.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
    ...(isDevelopment && statusCode >= 500 ? { stack: err?.stack } : {}),
  });
}
