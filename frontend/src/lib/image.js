/**
 * Shrinks a photo in the browser before upload, so members can pick any photo straight from
 * their camera (10–30 MB is common) and it still uploads quickly on mobile data.
 * The server re-encodes again (strips EXIF/GPS, makes the blurred copy), so this is only about speed.
 *
 * Formats the browser can't decode (e.g. HEIC on Chrome) are sent unchanged and handled by the server.
 */
const MAX_SIDE = 2000;
const SKIP_BELOW = 1.5 * 1024 * 1024; // already small enough

export async function compressImage(file) {
  if (!file?.type?.startsWith('image/') || file.type === 'image/gif' || file.size < SKIP_BELOW) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file; // browser can't decode it — let the server try
  }
}

export const compressImages = (files) => Promise.all([...files].map(compressImage));
