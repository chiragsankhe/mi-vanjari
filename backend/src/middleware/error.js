import { Prisma } from '@prisma/client';
import multer from 'multer';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/http.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let error = err;

  if (err instanceof multer.MulterError) {
    error = ApiError.badRequest(err.code === 'LIMIT_FILE_SIZE' ? 'This file is too large to upload (videos: up to 300 MB)' : err.message);
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') error = ApiError.conflict('This record already exists');
    else if (err.code === 'P2025') error = ApiError.notFound('Record not found');
  } else if (err?.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON body');
  }

  if (!(error instanceof ApiError)) {
    logger.error({ err, path: req.originalUrl }, 'Unhandled error');
    error = new ApiError(500, 'INTERNAL', env.isProd ? 'Something went wrong' : err.message || 'Something went wrong');
  }

  res.status(error.status).json({
    error: { code: error.code, message: error.message, ...(error.details && { details: error.details }) },
  });
}
