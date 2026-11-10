import { ApiError } from '../utils/http.js';

/**
 * Validate req.body / req.query / req.params with Zod schemas.
 * Parsed (coerced, stripped) values replace the originals.
 *   router.post('/', validate({ body: createSchema }), handler)
 */
export const validate = (schemas) => (req, _res, next) => {
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(ApiError.badRequest(details[0]?.message || 'Invalid input', details));
    }
    // req.query is a getter in Express 5; assign defensively for forward-compat
    Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true, enumerable: true });
  }
  next();
};
