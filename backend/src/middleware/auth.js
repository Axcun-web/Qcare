import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";
import { shouldTouchLastSeen } from "../utils/presence.js";

/**
 * Memverifikasi JWT dari header `Authorization: Bearer <token>`
 * dan menempelkan identitas pengguna ke `req.user`.
 *
 * The token alone is not trusted for status and role: the user row is read
 * on every request, so a deactivated account is locked out immediately
 * (instead of when its 1-day token expires) and a role change applies right
 * away. The same read also records lastSeenAt (Tabel 3.19 exc. 3).
 */
export async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(ApiError.unauthorized("Token tidak ditemukan"));
  }

  let payload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET);
  } catch {
    return next(
      ApiError.unauthorized("Token tidak valid atau sudah kedaluwarsa"),
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(payload.sub) },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastSeenAt: true,
      },
    });
    if (!user || !user.isActive) {
      return next(
        ApiError.unauthorized(
          "Akun tidak aktif atau tidak ditemukan. Silakan hubungi admin klinik.",
        ),
      );
    }
    req.user = { id: user.id.toString(), email: user.email, role: user.role };

    if (shouldTouchLastSeen(user.lastSeenAt)) {
      // Raw UPDATE: a Prisma update would also bump the @updatedAt column.
      // Not awaited; failing to record presence must not fail the request.
      prisma.$executeRaw`UPDATE "user" SET last_seen_at = now() WHERE id = ${user.id}`.catch(
        (err) => logger.warn("Gagal mencatat last_seen_at:", err.message),
      );
    }
    return next();
  } catch (err) {
    return next(err);
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
