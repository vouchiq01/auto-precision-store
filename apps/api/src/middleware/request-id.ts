import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Every request carries an id, echoed in the response header and in any error
 * body. When a customer says "payment failed at 3pm", that id is how you find
 * the one request out of thousands.
 *
 * `Request.id` is declared by pino-http as `ReqId` (string | number), so we do
 * not re-declare it here — two disagreeing declarations would clash. Read it
 * through `requestIdOf` instead, which always hands back a string.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get('x-request-id');
  req.id = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader('x-request-id', String(req.id));
  next();
}

export function requestIdOf(req: Request): string {
  return String(req.id ?? '');
}
