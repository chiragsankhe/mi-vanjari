/** Error with an HTTP status and a machine-readable code (handled by error middleware). */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Please log in to continue') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'You are not allowed to do this', code = 'FORBIDDEN') {
    return new ApiError(403, code, message);
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message = 'Already exists', code = 'CONFLICT') {
    return new ApiError(409, code, message);
  }
}

/** Wraps an async route handler so rejected promises reach the error middleware. */
export const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Normalises ?page & ?limit into Prisma skip/take. */
export function paginate(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/** Standard paginated response envelope. */
export function pageResult(items, total, { page, limit }) {
  return { items, page, limit, total, hasMore: page * limit < total };
}
