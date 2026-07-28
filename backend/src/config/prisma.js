import { PrismaClient } from "@prisma/client";
import { isDevelopment } from "./index.js";

/**
 * Instance Prisma tunggal (singleton) yang dipakai seluruh repository.
 */
export const prisma = new PrismaClient({
  log: isDevelopment ? ["warn", "error"] : ["error"],
});
