// =============================================================================
//  Typed application error carrying an HTTP status, surfaced by errorHandler.
// =============================================================================
export class AppError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (m: string, d?: unknown) => new AppError(400, m, d);
export const unauthorized = (m = "Unauthorized") => new AppError(401, m);
export const forbidden = (m = "Forbidden") => new AppError(403, m);
export const notFound = (m = "Not found") => new AppError(404, m);
export const conflict = (m: string) => new AppError(409, m);
export const unprocessable = (m: string, d?: unknown) => new AppError(422, m, d);
