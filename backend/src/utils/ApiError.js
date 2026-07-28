/**
 * Error operasional dengan HTTP status code.
 * Dilempar dari layer service, lalu diterjemahkan menjadi response
 * oleh middleware errorHandler.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {unknown} [details]
   */
  constructor(statusCode, message, details) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Tidak terautentikasi") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Akses ditolak") {
    return new ApiError(403, message);
  }

  static notFound(message = "Data tidak ditemukan") {
    return new ApiError(404, message);
  }

  static conflict(message, details) {
    return new ApiError(409, message, details);
  }
}
