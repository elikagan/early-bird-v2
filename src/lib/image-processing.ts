/**
 * Client-side image processing: HEIC/EXIF/compression via canvas API.
 * No npm dependencies — uses browser-native createImageBitmap + canvas.
 *
 * Pipeline: File → ImageBitmap (handles EXIF orientation) → Canvas resize → JPEG blob
 * Target: ≤1200px max dimension, JPEG q0.8, typically under 200KB output.
 */

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Process a raw image file from a phone camera into a web-ready JPEG.
 * Handles:
 *  - EXIF orientation (createImageBitmap auto-corrects in modern browsers)
 *  - Resize to fit within MAX_DIMENSION
 *  - JPEG compression at q0.8
 *
 * HEIC: Safari supports HEIC natively via createImageBitmap.
 * Chrome does NOT support HEIC — the file input won't even select HEIC files
 * on non-Apple devices. On iPhone, the OS transcodes to JPEG before handing
 * the file to Chrome. So in practice, HEIC files only arrive in Safari,
 * which can decode them.
 *
 * If createImageBitmap fails (old browser, corrupted file), throws with a
 * user-friendly message.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "Could not read this image. Try saving it as JPEG or PNG first."
    );
  }

  // Calculate target dimensions (fit within MAX_DIMENSION box)
  let { width, height } = bitmap;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  // Draw to canvas and export as JPEG
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: JPEG_QUALITY,
  });

  return { blob, width, height };
}

/**
 * Create a thumbnail data URL for immediate preview (before upload completes).
 * Returns a small (200px) JPEG data URL.
 */
export async function createThumbnail(file: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return "";
  }

  const scale = 200 / Math.max(bitmap.width, bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.6 });
  return URL.createObjectURL(blob);
}
