import type { ApiProblem } from '@aps/shared';

/**
 * The single place the browser and the server talk to the API.
 *
 * Two things this centralises:
 *  - `credentials: 'include'`, without which the refresh cookie never travels
 *    and sessions die after 15 minutes
 *  - turning problem+json into a typed error, so callers never inspect
 *    response.ok themselves and never render a raw 500 body to a customer
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * The guest-cart token, kept in the browser and sent as `x-cart-token`.
 *
 * The cart used to be tracked by a cookie set by the API's own domain. That is a
 * third-party cookie from the storefront's point of view, and phone browsers
 * block them — every request started a new empty cart. Carrying the token
 * ourselves works everywhere. The server returns it on every guest-cart response
 * and answers `none` once the cart has been handed to an account at sign-in.
 *
 * Only sent to the paths that need it: an extra header makes a cross-origin
 * request pre-flighted, and the catalogue calls should stay simple GETs.
 */
const CART_TOKEN_KEY = 'aps_cart_token';
const CART_TOKEN_PATHS = ['/api/cart', '/api/checkout', '/api/auth'];

function readCartToken(): string | null {
  try { return window.localStorage.getItem(CART_TOKEN_KEY); } catch { return null; }
}

function storeCartToken(value: string): void {
  try {
    if (value === 'none') window.localStorage.removeItem(CART_TOKEN_KEY);
    else if (value) window.localStorage.setItem(CART_TOKEN_KEY, value);
  } catch { /* private mode / storage blocked: the cookie path still applies where it works */ }
}

export class ApiError extends Error {
  readonly status: number;
  readonly type: string;
  readonly errors: Record<string, string[]> | undefined;
  readonly requestId: string | undefined;

  constructor(problem: ApiProblem) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
    this.status = problem.status;
    this.type = problem.type;
    this.errors = problem.errors;
    this.requestId = problem.requestId;
  }

  /** First message for a given field, for rendering next to an input. */
  fieldError(field: string): string | undefined {
    return this.errors?.[field]?.[0];
  }

  get isValidation(): boolean { return this.status === 422; }
  get isAuth(): boolean { return this.status === 401; }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  /** Next.js fetch cache controls, used by server components. */
  revalidate?: number | false;
  tags?: string[];
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, revalidate, tags, signal, headers = {} } = options;

  const inBrowser = typeof window !== 'undefined';
  const cartToken = inBrowser && CART_TOKEN_PATHS.some((prefix) => path.startsWith(prefix)) ? readCartToken() : null;

  const init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(cartToken ? { 'x-cart-token': cartToken } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  };

  if (revalidate !== undefined || tags) {
    init.next = { ...(revalidate !== undefined ? { revalidate } : {}), ...(tags ? { tags } : {}) };
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch (cause) {
    /* Network-level failure: the API is asleep (Render free tier cold start),
       the device is offline, or DNS is unhappy. Presented as a 503 so callers
       have one shape to handle. */
    throw new ApiError({
      type: 'network_error',
      title: 'Could not reach the store',
      status: 503,
      detail: 'We could not reach the store. Check your connection and try again.',
    });
  }

  if (inBrowser) {
    const issued = response.headers.get('x-cart-token');
    if (issued !== null) storeCartToken(issued);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }

  if (!response.ok) {
    const problem = (payload && typeof payload === 'object' && 'title' in payload)
      ? (payload as ApiProblem)
      : { type: 'unknown', title: 'Something went wrong', status: response.status, detail: text.slice(0, 200) };
    throw new ApiError(problem);
  }

  return payload as T;
}

/** Used by server components, where a failed fetch should degrade rather than 500 the page. */
export async function apiFetchSafe<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options);
  } catch {
    return null;
  }
}
