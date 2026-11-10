import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';

/**
 * Record an admin action or a security event. Never throws — auditing must not break the request.
 * @param {import('express').Request|null} req
 * @param {string} action e.g. USER_DELETED, PAYMENT_REFUNDED, ADMIN_LOGIN_FAILED, ADMIN_ACCESS_DENIED
 */
export async function audit(req, action, { targetType = null, targetId = null, details = null, actor = req?.user } = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorPhone: actor?.phone ?? actor?.email ?? null, // phone, or email for email-only admin accounts
        action,
        targetType,
        targetId,
        details: details ?? undefined,
        ip: req?.ip ?? null,
        userAgent: req?.get?.('user-agent')?.slice(0, 250) ?? null,
      },
    });
  } catch (err) {
    logger.warn({ err, action }, 'Could not write audit log');
  }
}
