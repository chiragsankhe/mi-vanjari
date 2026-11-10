import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { ApiError } from '../utils/http.js';

/**
 * Image storage abstraction.
 *   - Every image is re-encoded with sharp → EXIF/GPS metadata is stripped, size is capped.
 *   - A heavily blurred copy is generated for privacy-gated profile photos, so the
 *     real image URL is never sent to users who are not allowed to see it.
 *   - Driver: Cloudinary when configured, otherwise local disk (backend/uploads).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

if (env.storageDriver === 'cloudinary') {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

async function processImage(buffer, { maxSize = 1400 } = {}) {
  try {
    // limitInputPixels: false → very large camera photos (100+ MP) are accepted; they are shrunk right away
    const full = await sharp(buffer, { limitInputPixels: false })
      .rotate() // respect EXIF orientation before metadata is dropped
      .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const blur = await sharp(full).resize({ width: 48 }).blur(6).webp({ quality: 40 }).toBuffer();
    return { full, blur };
  } catch {
    throw ApiError.badRequest(
      "We couldn't read this photo. Please choose a JPG, PNG or WEBP image (on iPhone: Settings → Camera → Formats → Most Compatible).",
    );
  }
}

function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: `mivanjari/${folder}`, resource_type: 'image' }, (err, res) =>
      err ? reject(err) : resolve(res),
    );
    stream.end(buffer);
  });
}

/**
 * Persist an uploaded image (any size).
 * @param {Buffer | { path?: string, buffer?: Buffer }} input raw bytes, or a multer file (disk or memory)
 * @param {string} folder logical folder, e.g. "profiles", "services"
 * @returns {Promise<{url: string, blurUrl: string, key: string}>}
 */
export async function saveImage(input, folder = 'misc') {
  const source = Buffer.isBuffer(input) ? input : input?.buffer || input?.path;
  const { full, blur } = await processImage(source);

  if (env.storageDriver === 'cloudinary') {
    const [a, b] = await Promise.all([uploadBufferToCloudinary(full, folder), uploadBufferToCloudinary(blur, `${folder}/blur`)]);
    return { url: a.secure_url, blurUrl: b.secure_url, key: `${a.public_id}|${b.public_id}` };
  }

  const id = crypto.randomUUID();
  const dir = path.join(UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  await Promise.all([fs.writeFile(path.join(dir, `${id}.webp`), full), fs.writeFile(path.join(dir, `${id}.blur.webp`), blur)]);
  const base = `${env.PUBLIC_API_URL}/uploads/${folder}`;
  return { url: `${base}/${id}.webp`, blurUrl: `${base}/${id}.blur.webp`, key: `${folder}/${id}` };
}

/**
 * Publish a video that multer already wrote to uploads/videos.
 * Cloudinary: uploaded there and the local copy removed. Local: served from /uploads/videos.
 * @param {{ path: string, filename: string }} file multer disk file
 */
export async function saveVideo(file) {
  if (env.storageDriver === 'cloudinary') {
    try {
      const res = await cloudinary.uploader.upload(file.path, { resource_type: 'video', folder: 'mivanjari/videos' });
      return { url: res.secure_url, key: res.public_id };
    } finally {
      await fs.rm(file.path, { force: true });
    }
  }
  return { url: `${env.PUBLIC_API_URL}/uploads/videos/${file.filename}`, key: `videos/${file.filename}` };
}

/** Best-effort removal of a stored image (never throws). */
export async function deleteImage(key) {
  if (!key) return;
  try {
    if (env.storageDriver === 'cloudinary' && key.includes('|')) {
      await Promise.all(key.split('|').map((id) => cloudinary.uploader.destroy(id)));
    } else {
      await Promise.all([
        fs.rm(path.join(UPLOAD_DIR, `${key}.webp`), { force: true }),
        fs.rm(path.join(UPLOAD_DIR, `${key}.blur.webp`), { force: true }),
      ]);
    }
  } catch {
    /* ignore */
  }
}
