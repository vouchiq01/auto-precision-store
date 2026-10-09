import { API_URL } from './api';

/**
 * Browser side of the admin's photo upload.
 *
 * Phone photographs are often 4–8 MB and 4000 px wide. A shop page never shows
 * more than ~2000 px, and a client uploading on a mobile connection should not
 * wait for the original, so anything large is redrawn at a sensible size first.
 * Next.js still serves each visitor a right-sized, modern-format copy.
 */

const MAX_SIDE = 2400;
const RESIZE_ABOVE_BYTES = 2_500_000;
export const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

async function prepareImage(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;       // AVIF and anything else: send as it is

  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= MAX_SIDE && file.size <= RESIZE_ABOVE_BYTES) { bitmap.close(); return file; }

    const scale = Math.min(1, MAX_SIDE / longest);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) { bitmap.close(); return file; }

    context.fillStyle = '#fff';                                       // JPEG has no transparency
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const smaller = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    return smaller && smaller.size < file.size ? smaller : file;
  } catch {
    return file;                                                      // could not decode here: let the server judge it
  }
}

/** Upload one photograph and return its public URL. Throws an Error with a sentence a person can read. */
export async function uploadPhoto(file: File, token: string | null, folder: string): Promise<string> {
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) {
    throw new Error(`${file.name} is not a JPEG, PNG, WebP or AVIF photograph.`);
  }

  const body = await prepareImage(file);
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/admin/uploads`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': body.type || file.type,
        'x-folder': folder,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body,
    });
  } catch {
    throw new Error('Could not reach the store to upload. Check your connection and try again.');
  }

  const payload = await response.json().catch(() => null) as
    { url?: string; detail?: string; title?: string; errors?: Record<string, string[]> } | null;

  if (!response.ok || !payload?.url) {
    const reason = payload?.errors?.file?.[0] ?? payload?.detail ?? payload?.title ?? 'The upload failed.';
    throw new Error(`${file.name}: ${reason}`);
  }
  return payload.url;
}
