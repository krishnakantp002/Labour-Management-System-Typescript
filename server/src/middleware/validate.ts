import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Zod Validation Middleware Factory
 *
 * Validates req.body (and optionally req.query / req.params) against a Zod schema.
 * On failure, throws ZodError which is caught by the global error handler.
 *
 * Usage:
 *   router.post('/route', validate(mySchema), controller)
 *   router.get('/route', validate(mySchema, 'query'), controller)
 */
export function validate(
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const data = req[source];
    const result = schema.safeParse(data);

    if (!result.success) {
      // Throw ZodError — caught by errorHandler middleware
      throw result.error;
    }

    // Replace the source with parsed & validated data (strips unknown fields, applies transforms)
    req[source] = result.data;
    next();
  };
}
