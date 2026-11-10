import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { UPLOAD_DIR } from '../lib/storage.js';
import { ApiError } from '../utils/http.js';

/**
 * Video upload (admins only — e.g. AI-generated history clips). Streamed straight to disk,
 * never held in memory. MP4 / WebM / MOV up to 300 MB.
 */
export const MAX_VIDEO_MB = 300;
const VIDEO_TYPES = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };
export const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(UPLOAD_DIR, 'videos');
      fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
    },
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${VIDEO_TYPES[file.mimetype] || '.mp4'}`),
  }),
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => (VIDEO_TYPES[file.mimetype] ? cb(null, true) : cb(ApiError.badRequest('Please choose an MP4, WebM or MOV video'))),
});

/**
 * Image upload — no limit on photo size or on how many photos are sent.
 * Files are streamed to a temp folder on disk (never held in memory, so huge camera photos are fine),
 * then sharp re-encodes each one to a ~1400px WebP (lib/storage.js saveImage).
 * Temp files are always removed when the request ends (see cleanupTempUploads).
 */
export const TEMP_DIR = path.join(UPLOAD_DIR, '.tmp');
fs.mkdirSync(TEMP_DIR, { recursive: true });

export const upload = multer({
  storage: multer.diskStorage({
    destination: TEMP_DIR,
    filename: (_req, _file, cb) => cb(null, crypto.randomUUID()),
  }),
  fileFilter: (_req, file, cb) => (file.mimetype?.startsWith('image/') ? cb(null, true) : cb(ApiError.badRequest('Please choose an image file'))),
});

/** Deletes any temp image files multer wrote for this request, once the response is done. */
export function cleanupTempUploads(req, res, next) {
  res.on('close', () => {
    const files = [req.file, ...(Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat())];
    for (const f of files) if (f?.path?.startsWith(TEMP_DIR)) fs.rm(f.path, { force: true }, () => {});
  });
  next();
}
