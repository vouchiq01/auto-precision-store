import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { ValidationError } from '../lib/errors.ts';
import { zodToFieldErrors } from './error-handler.ts';

/**
 * Parse and REPLACE the request part with the parsed result, so downstream code
 * sees coerced, defaulted, trimmed values rather than raw strings. Anything not
 * described by the schema is dropped, which is the point.
 */
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(new ValidationError(zodToFieldErrors(result.error)));
    req.body = result.data as z.infer<T>;
    next();
  };
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) return next(new ValidationError(zodToFieldErrors(result.error)));
    /* req.query is a getter on newer Express versions, so assign onto a stashed
       property the handlers read instead of fighting the framework. */
    (req as Request & { validatedQuery?: unknown }).validatedQuery = result.data;
    next();
  };
}

export function validateParams<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) return next(new ValidationError(zodToFieldErrors(result.error)));
    (req as Request & { validatedParams?: unknown }).validatedParams = result.data;
    next();
  };
}

/** Typed accessors, so handlers never reach for `as` themselves. */
export function query<T>(req: Request): T {
  return (req as Request & { validatedQuery: T }).validatedQuery;
}

export function params<T>(req: Request): T {
  return (req as Request & { validatedParams: T }).validatedParams;
}
