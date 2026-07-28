import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Memverifikasi JWT dari header `Authorization: Bearer <token>`
 * dan menempelkan identitas pengguna ke `req.user`.
 */
export function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(ApiError.unauthorized("Token tidak ditemukan"));
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch {
    return next(
      ApiError.unauthorized("Token tidak valid atau sudah kedaluwarsa"),
    );
  }
}

/**
 * Membatasi akses endpoint berdasarkan role pengguna.
 * Contoh: `authorize('SUPERADMIN')` atau `authorize('PETUGAS', 'SUPERADMIN')`.
 *
 * @param {...('PASIEN'|'PETUGAS'|'SUPERADMIN')} roles
 */
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden("Role Anda tidak memiliki akses ke resource ini"),
      );
    }

    return next();
  };
