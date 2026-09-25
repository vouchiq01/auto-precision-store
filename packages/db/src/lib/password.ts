import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/* promisify() collapses scrypt's overloads and loses the options argument,
   so the wrapper is written out by hand to keep ScryptOptions typed. */
function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/**
 * Password hashing for admin accounts.
 *
 * scrypt from node:crypto rather than argon2id, which the design named. argon2
 * needs a native build step that is a recurring source of deploy failures on
 * Render's build image; scrypt is memory-hard, ships with Node, and at these
 * parameters is comfortably strong for a handful of seeded staff accounts.
 * Revisit if admin accounts ever become self-registered at scale.
 *
 * N=2^16 costs roughly 100 ms per hash, which is the point: it makes an offline
 * guessing attack expensive without making login feel slow.
 */
const PARAMS = { N: 65_536, r: 8, p: 1, keylen: 64, maxmem: 160 * 1024 * 1024 } as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password.normalize('NFKC'), salt, PARAMS.keylen, {
    N: PARAMS.N, r: PARAMS.r, p: PARAMS.p, maxmem: PARAMS.maxmem,
  });
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

/**
 * Constant-time verification. Returns false rather than throwing on a malformed
 * stored hash, so a corrupt row denies access instead of crashing the endpoint.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = Buffer.from(parts[4] as string, 'base64');
    const expected = Buffer.from(parts[5] as string, 'base64');
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

    const derived = await scrypt(password.normalize('NFKC'), salt, expected.length, {
      N, r, p, maxmem: PARAMS.maxmem,
    });

    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
