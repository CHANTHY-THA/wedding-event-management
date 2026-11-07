export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_BYTES = 8_000_000;

export interface PhotoCheck {
  accepted: File[];
  errors: string[];
}

/** Keeps JPG, PNG and WebP files up to 8 MB, and explains why any others were skipped. */
export function checkPhotoFiles(files: File[], limit = Infinity): PhotoCheck {
  const accepted: File[] = [];
  const errors: string[] = [];
  for (const file of files) {
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      errors.push(`${file.name}: choose a JPG, PNG, or WebP image.`);
    } else if (file.size > MAX_PHOTO_BYTES) {
      errors.push(`${file.name}: the file must be 8 MB or smaller.`);
    } else {
      accepted.push(file);
    }
  }
  if (accepted.length > limit) {
    errors.push(`Only ${limit} more ${limit === 1 ? 'photo' : 'photos'} can be added.`);
  }
  return { accepted: accepted.slice(0, limit), errors };
}
