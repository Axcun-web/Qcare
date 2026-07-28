import { app } from "./app.js";
import { config } from "./config/index.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./utils/logger.js";

const server = app.listen(config.PORT, () => {
  logger.info(
    `Qcare backend berjalan pada http://localhost:${config.PORT} [${config.NODE_ENV}]`,
  );
});

/**
 * Graceful shutdown: hentikan penerimaan request baru, tutup koneksi
 * Prisma, lalu keluar. Paksa keluar bila melewati batas waktu.
 *
 * @param {string} signal
 */
function shutdown(signal) {
  logger.info(`${signal} diterima, menutup server...`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
