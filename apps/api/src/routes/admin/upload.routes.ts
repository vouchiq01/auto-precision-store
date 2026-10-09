import { Router, raw } from 'express';
import { asyncHandler } from '../../lib/async-handler.ts';
import { ValidationError } from '../../lib/errors.ts';
import { storageAvailable, uploadMedia } from '../../services/storage.service.ts';

export const adminUploadRouter: Router = Router();

/**
 * Photograph upload.
 *
 * Takes the raw body rather than multipart, which keeps the server free of a
 * multipart parser: the admin UI sends the file's bytes and names the folder in
 * `x-folder`. Fewer dependencies, and one less place for a path-traversal bug to
 * hide. The file's type comes from its bytes, not from the Content-Type header —
 * see `sniffImageType` — so `application/octet-stream` is accepted here and judged
 * by what the file actually is.
 */
adminUploadRouter.post('/',
  raw({ type: ['image/*', 'application/octet-stream'], limit: '12mb' }),
  asyncHandler(async (req, res) => {
    if (!storageAvailable()) {
      res.status(503).json({
        type: 'storage_unavailable', title: 'Uploads unavailable', status: 503,
        detail: 'Photo storage is not set up on this server yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      });
      return;
    }

    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.byteLength === 0) {
      throw new ValidationError({ file: ['No file was received.'] });
    }

    const result = await uploadMedia({ buffer: body, folder: req.get('x-folder') ?? 'products' });
    res.status(201).json(result);
  }),
);
