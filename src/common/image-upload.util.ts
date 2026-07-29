import { BadRequestException } from '@nestjs/common';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export function validateFileUpload(
  file?: Express.Multer.File,
  options: {
    allowedMimeTypes?: string[];
    maxSizeBytes?: number;
    fieldLabel?: string;
    allowedFormatsLabel?: string;
  } = {},
) {
  if (!file) {
    return;
  }

  const allowedMimeTypes = new Set(options.allowedMimeTypes ?? []);
  const maxSizeBytes = options.maxSizeBytes ?? 10 * 1024 * 1024;
  const fieldLabel = options.fieldLabel ?? 'Le fichier';
  const allowedFormatsLabel =
    options.allowedFormatsLabel ?? options.allowedMimeTypes?.join(', ');

  if (allowedMimeTypes.size > 0 && !allowedMimeTypes.has(file.mimetype)) {
    throw new BadRequestException(
      `${fieldLabel} doit etre au format ${allowedFormatsLabel}`,
    );
  }

  if (file.size > maxSizeBytes) {
    throw new BadRequestException(
      `${fieldLabel} ne doit pas depasser ${Math.round(maxSizeBytes / (1024 * 1024))} Mo`,
    );
  }
}

export function validateImageUpload(
  file?: Express.Multer.File,
  options: { maxSizeBytes?: number; fieldLabel?: string } = {},
) {
  validateFileUpload(file, {
    allowedMimeTypes: [...ALLOWED_IMAGE_TYPES],
    maxSizeBytes: options.maxSizeBytes,
    fieldLabel: options.fieldLabel,
    allowedFormatsLabel: 'une image JPG, PNG, GIF ou WebP',
  });
}
