import { randomInt } from "node:crypto";

// No 0/O, 1/l/I: the admin reads this password out or copies it by hand.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const DIGITS = "23456789";

export const TEMP_PASSWORD_LENGTH = 10;

/**
 * Temporary password for an admin reset (Tabel 3.19 "mereset password").
 * Cryptographically random, meets the registration rule (8-72 characters)
 * and always contains at least one digit.
 *
 * @param {number} [length]
 * @returns {string}
 */
export function generateTempPassword(length = TEMP_PASSWORD_LENGTH) {
  const chars = Array.from(
    { length },
    () => ALPHABET[randomInt(ALPHABET.length)],
  );
  chars[randomInt(length)] = DIGITS[randomInt(DIGITS.length)];
  return chars.join("");
}
