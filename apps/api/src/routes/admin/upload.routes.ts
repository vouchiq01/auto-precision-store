import { Router, raw } from 'express';
import { asyncHandler } from '../../lib/async-handler.ts';
import { ValidationError } from '../../lib/errors.ts';
import { storageAvailable, uploadMedia } from '../../services/storage.service.ts';

export const adminUploadRouter: Router = Router();

/**
 * Binary upload.
 *
 * Takes the raw body rather than multipart, which keeps the server free of a
 * multipart parser: the admin UI sends the file bytes with the filename and
 * type in headers. Fewer dependencies, and one less place for a path-traversal
 * bug to hide.
 */
adminUploadRouter.post('/',
  raw({ type: ['image/*', 'video/mp4'], limit: '12mb' }),
  asyncHandler(async (req, res) => {
    if (!storageAvailable()) {
      res.status(503).json({
        type: 'storage_unavailable', title: 'Uploads unavailable', status: 503,
        detail: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable uploads.',
      });
      return;
    }

    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.byteLength === 0) {
      throw new ValidationError({ file: ['No file was received.'] });
    }

    const contentType = req.get('content-type') ?? 'application/octet-stream';
    const filename = req.get('x-filename') ?? 'upload';
    const folder = (req.get('x-folder') ?? 'products').replace(/[^a-z0-9/-]/gi, '');

    const result = await uploadMedia({ buffer: body, filename, contentType, folder });
    res.status(201).json(result);
  }),
);
