import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

/** Single shared Prisma client (re-used across hot reloads in development). */
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: env.isDev ? ['warn', 'error'] : ['error'],
  });

if (!env.isProd) globalForPrisma.__prisma = prisma;
