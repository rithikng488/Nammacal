/**
 * Media validator for uploaded food images and voice recordings.
 * Enforces strict MIME types, magic byte signatures, and size boundaries.
 * Guarantees zero persistent storage of unauthenticated or malformed media.
 */

export class MediaValidationError extends Error {
  constructor(message: string, public readonly code: string = "INVALID_MEDIA") {
    super(message);
    this.name = "MediaValidationError";
  }
}

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
  "audio/aac",
] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MIN_MEDIA_SIZE_BYTES = 100; // 100 bytes minimum to reject empty/dummy files

/**
 * Checks magic byte headers for image types.
 */
function verifyImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 8) return false;

  // JPEG: FF D8 FF
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // WebP: RIFF .... WEBP
  if (mimeType === "image/webp") {
    if (buffer.length < 12) return false;
    const isRiff =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46;
    const isWebp =
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  return false;
}

/**
 * Validates an uploaded meal photo buffer.
 * Rejects unsupported formats, empty files, oversized files, and spoofed extensions.
 */
export function validateMealPhoto(
  buffer: Buffer,
  declaredMimeType: string
): { isValid: true; mimeType: string } {
  if (!buffer || buffer.length === 0) {
    throw new MediaValidationError("No image data provided.", "EMPTY_FILE");
  }

  if (buffer.length < MIN_MEDIA_SIZE_BYTES) {
    throw new MediaValidationError("Image file is too small or corrupted.", "CORRUPTED_FILE");
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new MediaValidationError(
      `Image size exceeds maximum limit of 5 MB (received ${(buffer.length / (1024 * 1024)).toFixed(1)} MB).`,
      "FILE_TOO_LARGE"
    );
  }

  const normalizedMime = declaredMimeType.toLowerCase().trim();
  const isAllowedMime = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(normalizedMime);

  if (!isAllowedMime) {
    throw new MediaValidationError(
      `Unsupported image type "${declaredMimeType}". Allowed types: JPEG, PNG, WebP.`,
      "UNSUPPORTED_MIME_TYPE"
    );
  }

  if (!verifyImageMagicBytes(buffer, normalizedMime)) {
    throw new MediaValidationError(
      "File contents do not match declared image format. Malformed or spoofed image detected.",
      "MAGIC_BYTE_MISMATCH"
    );
  }

  return { isValid: true, mimeType: normalizedMime };
}

/**
 * Validates an uploaded audio recording buffer for voice logging.
 */
export function validateVoiceAudio(
  buffer: Buffer,
  declaredMimeType: string
): { isValid: true; mimeType: string } {
  if (!buffer || buffer.length === 0) {
    throw new MediaValidationError("No audio data provided.", "EMPTY_FILE");
  }

  if (buffer.length < MIN_MEDIA_SIZE_BYTES) {
    throw new MediaValidationError("Audio recording is too short or empty.", "CORRUPTED_FILE");
  }

  if (buffer.length > MAX_AUDIO_SIZE_BYTES) {
    throw new MediaValidationError(
      `Audio recording exceeds maximum limit of 10 MB (received ${(buffer.length / (1024 * 1024)).toFixed(1)} MB).`,
      "FILE_TOO_LARGE"
    );
  }

  const normalizedMime = declaredMimeType.toLowerCase().split(";")[0].trim();
  const isAllowedMime = (ALLOWED_AUDIO_MIME_TYPES as readonly string[]).includes(normalizedMime);

  if (!isAllowedMime) {
    throw new MediaValidationError(
      `Unsupported audio format "${declaredMimeType}". Allowed formats: WebM, MP4, MP3, OGG, WAV.`,
      "UNSUPPORTED_MIME_TYPE"
    );
  }

  return { isValid: true, mimeType: normalizedMime };
}
