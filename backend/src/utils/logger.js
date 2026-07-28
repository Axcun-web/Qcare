import { isDevelopment } from "../config/index.js";

/**
 * Pembungkus logging minimal. Sengaja dibuat sebagai satu titik akses
 * agar dapat diganti dengan logging library terstruktur (mis. pino atau
 * winston) tanpa mengubah pemanggilan di seluruh kode.
 */
export const logger = {
  /** @param {...unknown} args */
  info: (...args) => console.info("[info]", ...args),

  /** @param {...unknown} args */
  warn: (...args) => console.warn("[warn]", ...args),

  /** @param {...unknown} args */
  error: (...args) => console.error("[error]", ...args),

  /** Hanya tampil pada mode development. @param {...unknown} args */
  debug: (...args) => {
    if (isDevelopment) {
      console.debug("[debug]", ...args);
    }
  },
};
