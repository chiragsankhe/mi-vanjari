import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { UPLOAD_DIR } from './lib/storage.js';
import { errorHandler, notFound } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { cleanupTempUploads } from './middleware/upload.js';
import { webhookRouter } from './modules/payments/payments.routes.js';
import api from './routes.js';
import { ApiError } from './utils/http.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY); // real visitor IPs behind Render's proxy (rate limiting)
  app.disable('x-powered-by');

  // Security headers. The CSP allows only what the website really uses: our own files, Google Fonts,
  // Razorpay checkout, and https images (Cloudinary photos).
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          mediaSrc: ["'self'", 'blob:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'https://*.razorpay.com'],
          frameSrc: ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
          workerSrc: ["'self'", 'blob:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'", 'https://api.razorpay.com'],
          frameAncestors: ["'self'"],
          ...(env.isProd && { upgradeInsecureRequests: [] }),
        },
      },
    }),
  );
  app.use(
    cors((req, cb) => {
      const origin = req.get('origin');
      // requests from the site itself (whatever domain it is served on) are always allowed
      const sameSite = origin && origin === `${req.protocol}://${req.get('host')}`;
      if (sameSite || env.isAllowedOrigin(origin)) return cb(null, { origin: true, credentials: true });
      cb(ApiError.forbidden(`Not allowed by CORS: ${origin} — add it to CORS_ORIGIN in backend/.env`, 'CORS'));
    }),
  );
  app.use(compression());
  // Razorpay webhook needs the raw body for signature verification — mount before the JSON parser
  app.use('/api/v1/payments/webhook', webhookRouter);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(cleanupTempUploads);
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url.startsWith('/uploads') || req.url.startsWith('/assets/') || req.url.endsWith('/health') },
      // short log lines: no headers (and so no tokens or cookies) in the logs
      serializers: {
        req: (req) => ({ method: req.method, url: req.url, ip: req.remoteAddress }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  // Locally stored images (when Cloudinary is not configured)
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }));

  app.use('/api/v1', apiLimiter, api);

  // The website itself (frontend/dist, built by `npm run build`): one address for site + API + chat,
  // so login cookies work on every browser (incl. iPhone Safari) and no CORS setup is needed.
  const WEB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
  if (fs.existsSync(path.join(WEB_DIR, 'index.html'))) {
    app.use(
      express.static(WEB_DIR, {
        index: false,
        setHeaders: (res, file) =>
          // hashed build files never change → cache for a year; everything else revalidates
          res.setHeader('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache'),
      }),
    );
    // every other page address (/matrimonial, /profile/123 …) is handled by the React app
    app.get(/^\/(?!api\/|uploads\/|socket\.io\/).*/, (req, res, next) => {
      if (!req.accepts('html')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(WEB_DIR, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => res.json({ name: 'Mi Vanjari API', version: '1.0.0', madeBy: 'Chirag Sankhe', docs: '/api/v1/health', note: 'Run `npm run build` to serve the website from here.' }));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
