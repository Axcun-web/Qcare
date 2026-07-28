/**
 * Membungkus handler async agar rejected promise diteruskan ke
 * error middleware, bukan menjadi unhandled rejection.
 *
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<unknown>} fn
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
