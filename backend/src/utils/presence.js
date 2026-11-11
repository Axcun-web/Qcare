/**
 * "Who is using the app right now", from User.lastSeenAt. Stateless JWTs have
 * no server-side session, so the last authenticated request is the signal.
 * Used for the Tabel 3.19 exc. 3 warning before deactivating a Petugas.
 */

/** Write lastSeenAt at most this often per user (one UPDATE a minute). */
export const TOUCH_INTERVAL_MS = 60 * 1000;

/** Counts as "sedang menggunakan aplikasi" if seen within this window. */
export const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

/**
 * @param {Date | null} lastSeenAt
 * @param {Date} [now]
 */
export const shouldTouchLastSeen = (lastSeenAt, now = new Date()) =>
  !lastSeenAt || now - lastSeenAt >= TOUCH_INTERVAL_MS;

/**
 * @param {Date | null} lastSeenAt
 * @param {Date} [now]
 */
export const isRecentlyActive = (lastSeenAt, now = new Date()) =>
  Boolean(lastSeenAt) && now - lastSeenAt < ACTIVE_WINDOW_MS;
