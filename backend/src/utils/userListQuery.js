/**
 * Query parameters of GET /api/admin/users (Users tab: search, filters,
 * paging) turned into a Prisma `where` plus skip/take. Kept free of Prisma
 * so it can be unit-tested.
 */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
const ROLES = ["PASIEN", "PETUGAS", "SUPERADMIN"];

const positiveInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

/**
 * @param {{ q?: string, role?: string, status?: string, page?: string,
 *   pageSize?: string }} query - req.query; unknown values are ignored
 * @returns {{ where: object, skip: number, take: number, page: number,
 *   pageSize: number }}
 */
export function parseUserListQuery(query = {}) {
  const where = {};
  const q = typeof query.q === "string" ? query.q.trim() : "";
  if (q) {
    where.OR = [
      { nama: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (ROLES.includes(query.role)) where.role = query.role;
  if (query.status === "active") where.isActive = true;
  if (query.status === "inactive") where.isActive = false;

  const page = positiveInt(query.page, 1);
  const pageSize = Math.min(
    positiveInt(query.pageSize, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  return { where, skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}
