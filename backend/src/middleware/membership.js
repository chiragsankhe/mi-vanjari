import { membershipStatus } from '../services/membership.service.js';
import { ApiError } from '../utils/http.js';

/**
 * Matrimony paywall. Responds 402 MEMBERSHIP_REQUIRED (with fee details) when the
 * paid period has started and the user has no active membership.
 */
export async function requireMatrimonyAccess(req, _res, next) {
  try {
    const status = await membershipStatus(req.user.id, req.user.role);
    req.membership = status;
    if (status.hasAccess) return next();
    const err = new ApiError(402, 'MEMBERSHIP_REQUIRED', `Matrimony membership (₹${status.fee} per year) is required to continue.`);
    err.details = { fee: status.fee, days: status.days };
    next(err);
  } catch (err) {
    next(err);
  }
}
