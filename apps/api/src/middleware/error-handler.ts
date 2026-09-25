import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiProblem } from '@aps/shared';
import { AppError, RateLimitError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import { requestIdOf } from './request-id.ts';
import { isProduction } from '../env.ts';

/** Turn a ZodError into the field-keyed shape the frontend renders next to inputs. */
export function zodToFieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

export function notFoundHandler(req: Request, res: Response): void {
  const problem: ApiProblem = {
    type: 'not_found', title: 'Not found', status: 404,
    detail: `No route matches ${req.method} ${req.path}`, requestId: requestIdOf(req),
  };
  res.status(404).json(problem);
}

/**
 * The single place HTTP status codes are decided.
 * Anything that is not a recognised domain error becomes a 500 with a generic
 * message — internal details never reach the client in production.
 */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;

  if (error instanceof ZodError) {
    const problem: ApiProblem = {
      type: 'validation_error', title: 'Validation failed', status: 422,
      detail: 'Some fields need attention.', errors: zodToFieldErrors(error), requestId: requestIdOf(req),
    };
    logger.warn({ reqId: requestIdOf(req), errors: problem.errors }, 'validation failed');
    res.status(422).json(problem);
    return;
  }

  if (error instanceof AppError) {
    if (error instanceof RateLimitError) res.setHeader('Retry-After', String(error.retryAfterSeconds));

    const level = error.expected ? 'warn' : 'error';
    logger[level]({ reqId: requestIdOf(req), type: error.type, status: error.status, err: error }, error.title);
    res.status(error.status).json(error.toProblem(requestIdOf(req)));
    return;
  }

  logger.error({ reqId: requestIdOf(req), err: error }, 'unhandled error');

  const problem: ApiProblem = {
    type: 'internal_error', title: 'Something went wrong', status: 500,
    detail: isProduction
      ? 'Something went wrong on our side. Please try again, and tell us the reference below if it keeps happening.'
      : String(error instanceof Error ? error.stack : error),
    requestId: requestIdOf(req),
  };
  res.status(500).json(problem);
}
