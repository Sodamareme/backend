import { BadRequestException } from '@nestjs/common';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export function validateImageUpload(
  file?: Express.Multer.File,
  options: { maxSizeBytes?: number; fieldLabel?: string } = {},
) {
  if (!file) {
    return;
  }

  const maxSizeBytes = options.maxSizeBytes ?? 10 * 1024 * 1024;
  const fieldLabel = options.fieldLabel ?? 'Le fichier';

  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    throw new BadRequestException(
      `${fieldLabel} doit etre une image JPG, PNG, GIF ou WebP`,
    );
  }

  if (file.size > maxSizeBytes) {
    throw new BadRequestException(
      `${fieldLabel} ne doit pas depasser ${Math.round(maxSizeBytes / (1024 * 1024))} Mo`,
    );
  }
}
