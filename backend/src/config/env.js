import './load-env.js'; // loads .env and builds DATABASE_URL from DB_NAME / DB_PASSWORD
import { z } from 'zod';

/**
 * Centralised, validated configuration.
 * Every environment variable the API uses is declared here — nowhere else reads process.env.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // The site's public address. On Render it defaults to the address Render gives the service.
  PUBLIC_API_URL: z.string().default(process.env.RENDER_EXTERNAL_URL || 'http://localhost:4000'),
  // How many proxies sit in front of the server (for the real visitor IP used by rate limits).
  // Check /api/v1/health after deploying: "ip" must be YOUR address. If not, try 2.
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),

  DATABASE_URL: z
    .string({ required_error: 'set DB_NAME and DB_PASSWORD (or DATABASE_URL) in backend/.env' })
    .min(1, 'set DB_NAME and DB_PASSWORD (or DATABASE_URL) in backend/.env'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(30),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  ADMIN_PHONES: z.string().default(''),

  MSG91_AUTH_KEY: z.string().optional().default(''),
  MSG91_TEMPLATE_ID: z.string().optional().default(''),
  OTP_TTL_MINUTES: z.coerce.number().default(5),

  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),

  // Razorpay (payments). Without keys, development uses a clearly-marked test checkout; production refuses payments.
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  ADMIN_SESSION_HOURS: z.coerce.number().default(12),

  // Email (admin login codes + sign-in alerts). Gmail: SMTP_PASS is a 16-letter App Password.
  SMTP_HOST: z.string().optional().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().optional().default(''),
  // Brevo (free 300 emails/day) sends over HTTPS — works on hosts that block email ports (e.g. free cloud plans).
  // When set it is used instead of SMTP. The sender address must be verified in Brevo.
  BREVO_API_KEY: z.string().optional().default(''),
  ALLOW_LOCAL_UPLOADS: z.string().optional().default(''),
  ADMIN_EMAILS: z.string().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

const e = parsed.data;

const originOf = (url) => {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
};
// The site's own address is always allowed (the backend also serves the website). Render sets RENDER_EXTERNAL_URL.
const corsOrigins = [...e.CORS_ORIGIN.split(','), originOf(e.PUBLIC_API_URL), originOf(process.env.RENDER_EXTERNAL_URL)]
  .map((s) => s?.trim())
  .filter(Boolean);

// localhost / 127.0.0.1 / [::1] on any port, plus private Wi-Fi/LAN addresses (phones on the same network)
const DEV_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

/**
 * CORS rule shared by Express and Socket.io.
 * Production: only the origins listed in CORS_ORIGIN.
 * Development: also any local or LAN origin, so a second Vite port (5174…) or a phone on your Wi-Fi works.
 */
function isAllowedOrigin(origin) {
  if (!origin || corsOrigins.includes(origin)) return true;
  if (e.NODE_ENV === 'production') return false;
  try {
    return DEV_HOST.test(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export const env = {
  ...e,
  isProd: e.NODE_ENV === 'production',
  isDev: e.NODE_ENV === 'development',
  corsOrigins,
  isAllowedOrigin,
  adminPhones: e.ADMIN_PHONES.split(',').map((s) => s.trim()).filter(Boolean),
  otpProvider: e.MSG91_AUTH_KEY && e.MSG91_TEMPLATE_ID ? 'msg91' : 'console',
  mailProvider: e.BREVO_API_KEY ? 'brevo' : e.SMTP_USER && e.SMTP_PASS ? 'smtp' : null,
  mailConfigured: Boolean(e.BREVO_API_KEY || (e.SMTP_USER && e.SMTP_PASS)),
  adminEmails: e.ADMIN_EMAILS.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  paymentsLive: Boolean(e.RAZORPAY_KEY_ID && e.RAZORPAY_KEY_SECRET),
  storageDriver: e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET ? 'cloudinary' : 'local',
};

/**
 * Production safety check at startup. Without an SMS provider nobody could log in (and login codes would
 * only exist in the server log), so the server refuses to start. Other missing services only warn.
 */
if (env.isProd) {
  const fatal = [];
  if (!env.mailConfigured) fatal.push('BREVO_API_KEY (or SMTP_USER + SMTP_PASS) — members log in with a code sent by email');
  if (!e.MAIL_FROM) fatal.push('MAIL_FROM, e.g. "Mi Vanjari <mivanjari1111@gmail.com>" (must be a verified sender)');
  if (env.storageDriver !== 'cloudinary' && !e.ALLOW_LOCAL_UPLOADS) fatal.push('CLOUDINARY_* — free hosts delete local files on every restart (set ALLOW_LOCAL_UPLOADS=1 only on a server with a permanent disk)');
  if (env.adminPhones.length) fatal.push('ADMIN_PHONES must be empty in production (admins sign in with ADMIN_EMAILS)');
  const list = (items) => items.map((x) => `\n  - ${x}`).join('');
  if (fatal.length) {
    console.error(`\n❌ Production setup incomplete:${list(fatal)}\n`);
    process.exit(1);
  }
  const warn = [];
  if (!env.paymentsLive) warn.push('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET — matrimony payments will be refused');
  // the website runs on another address (Vercel) → its address must be allowed
  if (!process.env.RENDER_EXTERNAL_URL && !e.CORS_ORIGIN.split(',').some((o) => o.trim().startsWith('https://')))
    warn.push('CORS_ORIGIN — set it to your website address, e.g. https://mivanjari.com,https://www.mivanjari.com');
  if (!e.RAZORPAY_WEBHOOK_SECRET) warn.push('RAZORPAY_WEBHOOK_SECRET — payment webhooks will be refused');
  if (warn.length) console.warn(`\n⚠️  Production setup warnings:${list(warn)}\n`);
}
