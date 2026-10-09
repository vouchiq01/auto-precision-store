import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isProduction, supabaseConfigured } from '../env.ts';
import { AppError, ValidationError } from '../lib/errors.ts';

/**
 * Admin photo uploads.
 *
 * In production the files go to Supabase Storage. The bucket is public-read, so
 * the storefront serves photographs straight from the CDN without signing every
 * URL; writes only ever happen here, authenticated by the service-role key, which
 * never leaves the server (it is a Render environment variable, not a
 * NEXT_PUBLIC one).
 *
 * Three safeguards worth knowing:
 *  - The file's real type is read from its first bytes. The Content-Type header
 *    is whatever the client chose to send, so a script renamed `photo.png` would
 *    otherwise be stored and served as an "image".
 *  - Only photographs are accepted — JPEG, PNG, WebP, AVIF. SVG and video are
 *    refused: next/image will not render SVG, and an SVG can carry script.
 *  - The client's filename is never used as a path; every file gets a UUID name.
 *
 * With no Supabase settings and outside production, uploads fall back to the web
 * app's `public/uploads` folder so the admin can be tried on a laptop. That
 * folder is git-ignored and is never used in production.
 */

const MAX_BYTES = 12 * 1024 * 1024;

export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';
const EXTENSION: Record<ImageType, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif',
};

/** The real type of an image from its leading bytes, or null if it is not one we accept. */
export function sniffImageType(buffer: Buffer): ImageType | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buffer.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(buffer.toString('ascii', 8, 12))) return 'image/avif';
  return null;
}

/** Where bytes actually go. Swappable so tests never touch the network or disk. */
export interface StorageDriver {
  put(path: string, buffer: Buffer, contentType: string): Promise<string>;
  remove(path: string): Promise<void>;
}

function supabaseDriver(): StorageDriver {
  let client: SupabaseClient | null = null;
  let bucketReady = false;
  const bucket = env.SUPABASE_STORAGE_BUCKET;

  const get = () => (client ??= createClient(env.SUPABASE_URL as string, env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

  /* Create the public bucket the first time it is needed, so there is no manual
     step in the Supabase dashboard. "Already exists" is the normal case. */
  async function ensureBucket() {
    if (bucketReady) return;
    const { error } = await get().storage.createBucket(bucket, {
      public: true, fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: Object.keys(EXTENSION),
    });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      throw new AppError({ status: 502, type: 'upload_failed', title: 'Upload failed', detail: `Could not prepare storage: ${error.message}`, expected: false });
    }
    bucketReady = true;
  }

  return {
    async put(path, buffer, contentType) {
      await ensureBucket();
      const { error } = await get().storage.from(bucket).upload(path, buffer, { contentType, upsert: false, cacheControl: '31536000' });
      if (error) throw new AppError({ status: 502, type: 'upload_failed', title: 'Upload failed', detail: error.message, expected: false });
      return get().storage.from(bucket).getPublicUrl(path).data.publicUrl;
    },
    async remove(path) {
      const { error } = await get().storage.from(bucket).remove([path]);
      if (error) throw new AppError({ status: 502, type: 'delete_failed', title: 'Delete failed', detail: error.message, expected: false });
    },
  };
}

function localDriver(): StorageDriver {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../web/public/uploads');
  return {
    async put(path, buffer) {
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, buffer);
      return `/uploads/${path}`;
    },
    async remove(path) {
      await rm(join(root, path), { force: true });
    },
  };
}

let driver: StorageDriver | null = null;

/** Tests inject a fake; pass null to go back to the real one. */
export function setStorageDriver(next: StorageDriver | null): void {
  driver = next;
}

export function storageAvailable(): boolean {
  return Boolean(driver) || supabaseConfigured || !isProduction;
}

function getDriver(): StorageDriver {
  if (driver) return driver;
  if (supabaseConfigured) return (driver = supabaseDriver());
  if (!isProduction) return (driver = localDriver());
  throw new AppError({
    status: 503, type: 'storage_unavailable', title: 'Uploads unavailable',
    detail: 'Photo storage is not set up on this server. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
  });
}

export interface UploadResult { url: string; path: string; size: number; contentType: string }

export async function uploadMedia(params: { buffer: Buffer; folder?: string }): Promise<UploadResult> {
  if (params.buffer.byteLength === 0) throw new ValidationError({ file: ['No file was received.'] });
  if (params.buffer.byteLength > MAX_BYTES) {
    throw new ValidationError({ file: [`Photos must be under ${MAX_BYTES / 1024 / 1024} MB.`] });
  }

  const contentType = sniffImageType(params.buffer);
  if (!contentType) {
    throw new ValidationError({ file: ['That file is not a JPEG, PNG, WebP or AVIF photograph.'] });
  }

  /* A folder is organisation only. Reduce it to lowercase words and slashes so a
     crafted header cannot climb out of the bucket or the uploads directory. */
  const folder = (params.folder ?? 'products').toLowerCase().replace(/[^a-z0-9/-]/g, '').replace(/\/+/g, '/').replace(/^\/|\/$/g, '') || 'products';
  const path = `${folder}/${randomUUID()}.${EXTENSION[contentType]}`;

  const url = await getDriver().put(path, params.buffer, contentType);
  return { url, path, size: params.buffer.byteLength, contentType };
}

export async function deleteMedia(path: string): Promise<void> {
  await getDriver().remove(path);
}
