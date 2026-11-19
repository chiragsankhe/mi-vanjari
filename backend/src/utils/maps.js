import { z } from 'zod';

/** Only real Google Maps links are accepted (full links, share links and short links). */
const HOSTS = ['google.com', 'google.co.in', 'maps.app.goo.gl', 'goo.gl', 'g.co', 'maps.google.com'];

export const isGoogleMapsUrl = (value) => {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.replace(/^www\./, '');
    if (!HOSTS.some((h) => host === h || host.endsWith('.' + h))) return false;
    // google.com is more than maps: require a maps path for it
    if ((host === 'google.com' || host === 'google.co.in') && !/^\/maps/.test(u.pathname)) return false;
    if (host === 'goo.gl' && !/^\/maps/.test(u.pathname)) return false;
    return true;
  } catch {
    return false;
  }
};

/** Optional "Google Maps link" field: empty becomes null. */
export const mapUrlField = z
  .string()
  .trim()
  .max(600)
  .refine((v) => !v || isGoogleMapsUrl(v), 'Paste a Google Maps link (open the place in Google Maps → Share → Copy link)')
  .optional()
  .nullable()
  .transform((v) => v || null);
