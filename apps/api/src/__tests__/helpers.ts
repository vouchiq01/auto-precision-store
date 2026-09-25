import type { Express } from 'express';
import type { AddressInput } from '@aps/shared';

/**
 * Minimal HTTP client for the integration tests.
 *
 * Boots the real Express app on an ephemeral port and talks to it over actual
 * HTTP, rather than calling handlers directly — so middleware, body parsing,
 * cookies, CORS and the error handler are all genuinely exercised.
 */
/* Deliberately not extending RequestInit: its `body` is BodyInit, and tests
   want to pass a plain object that this helper serialises. */
export interface RequestOptions {
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
}

export interface TestResponse {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  headers: Headers;
}

export interface TestClient {
  request: (method: string, path: string, options?: RequestOptions) => Promise<TestResponse>;
  close: () => Promise<void>;
  baseUrl: string;
}

export async function startTestServer(app: Express): Promise<TestClient> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not determine test server port');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  // Cookies are carried between calls so cart and session flows work as in a browser.
  const cookieJar = new Map<string, string>();

  async function request(method: string, path: string, options: RequestOptions = {}): Promise<TestResponse> {
    const headers = new Headers(options.headers ?? {});
    if (options.body !== undefined) headers.set('content-type', 'application/json');
    if (options.token) headers.set('authorization', `Bearer ${options.token}`);
    if (cookieJar.size > 0) {
      headers.set('cookie', [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; '));
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });

    for (const [key, value] of response.headers) {
      if (key.toLowerCase() === 'set-cookie') {
        for (const cookie of value.split(/,(?=[^;]+=)/)) {
          const [pair] = cookie.split(';');
          const [name, ...rest] = (pair ?? '').split('=');
          if (name) cookieJar.set(name.trim(), rest.join('=').trim());
        }
      }
    }

    const text = await response.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }

    return { status: response.status, body, headers: response.headers };
  }

  return {
    request,
    baseUrl,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export const BENGALURU_ADDRESS: AddressInput = {
  fullName: 'Priya Raghavan',
  phone: '+919876543210',
  line1: '14, 3rd Cross, Indiranagar',
  line2: null,
  landmark: null,
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  type: 'home',
  isDefault: true,
};

export const MUMBAI_ADDRESS: AddressInput = {
  ...BENGALURU_ADDRESS,
  line1: '402, Hill Road, Bandra West',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400050',
};
