import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, supabaseConfigured } from '../env.ts';
import { AppError, ValidationError } from '../lib/errors.ts';

/**
 * Admin media uploads, straight into Supabase Storage.
 *
 * The bucket is public-read so Next.js can serve images from the CDN without
 * signing every URL; writes go only through this service, authenticated by the
 * service-role key which never leaves the server.
 */

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'video/mp4']);
const MAX_BYTES = 12 * 1024 * 1024;

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabaseConfigured) {
    throw new AppError({
      status: 503, type: 'storage_unavailable', title: 'Uploads unavailable',
      detail: 'Supabase Storage is not configured on this server.',
    });
  }
  client ??= createClient(env.SUPABASE_URL as string, env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export interface UploadResult { url: string; path: string; size: number; contentType: string }

export async function uploadMedia(params: {
  buffer: Buffer; filename: string; contentType: string; folder?: string;
}): Promise<UploadResult> {
  if (!ALLOWED_MIME.has(params.contentType)) {
    throw new ValidationError({ file: [`${params.contentType} is not an allowed file type.`] });
  }
  if (params.buffer.byteLength > MAX_BYTES) {
    throw new ValidationError({ file: [`Files must be under ${MAX_BYTES / 1024 / 1024} MB.`] });
  }

  /* Never trust the client's filename as a path: strip directories and unusual
     characters, then prefix a UUID so two uploads called "1.jpg" cannot collide
     or overwrite each other. */
  const safeName = params.filename.split(/[\\/]/).pop()?.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-60) ?? 'file';
  const path = `${params.folder ?? 'uploads'}/${randomUUID()}-${safeName}`;

  const { error } = await getClient().storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(path, params.buffer, { contentType: params.contentType, upsert: false, cacheControl: '31536000' });

  if (error) {
    throw new AppError({ status: 502, type: 'upload_failed', title: 'Upload failed', detail: error.message, expected: false });
  }

  const { data } = getClient().storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(path);

  return { url: data.publicUrl, path, size: params.buffer.byteLength, contentType: params.contentType };
}

export async function deleteMedia(path: string): Promise<void> {
  const { error } = await getClient().storage.from(env.SUPABASE_STORAGE_BUCKET).remove([path]);
  if (error) {
    throw new AppError({ status: 502, type: 'delete_failed', title: 'Delete failed', detail: error.message, expected: false });
  }
}

export function storageAvailable(): boolean {
  return supabaseConfigured;
}
