import { getRelationship } from '../services/privacy.service.js';
import { ApiError } from '../utils/http.js';

/**
 * Resolves the viewer ↔ target relationship once and attaches it to `req.relationship`.
 * Used on every GET /matrimonial/:userId (and /users/:userId) request; the controller then
 * serialises the profile with `toProfileDetail`, which enforces the privacy rules.
 */
export async function privacyGate(req, _res, next) {
  try {
    const rel = await getRelationship(req.user?.id, req.params.userId);
    if (rel.blocked) return next(ApiError.notFound('Profile not available'));
    req.relationship = rel;
    next();
  } catch (err) {
    next(err);
  }
}
