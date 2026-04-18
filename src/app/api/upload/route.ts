import { storage } from "@/lib/storage";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { nanoid } from "nanoid";
import sharp from "sharp";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const THUMB_MAX = 400;
const THUMB_QUALITY = 70;

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!user.dealer_id) return error("Dealer account required", 403);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return error("No file provided");
  if (!ALLOWED_TYPES.has(file.type)) {
    return error(`Invalid file type: ${file.type}. Use JPEG, PNG, or WebP.`);
  }
  if (file.size > MAX_FILE_SIZE) {
    return error(`File too large (${Math.round(file.size / 1024 / 1024)}MB). Max 15MB.`);
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileId = nanoid(12);
  const path = `${user.dealer_id}/${fileId}.${ext}`;
  const thumbPath = `${user.dealer_id}/${fileId}_thumb.jpg`;

  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload original
  const { error: uploadError } = await storage.upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return error(`Upload failed: ${uploadError.message}`, 500);
  }

  // Generate and upload thumbnail — 400×400 square, cropped from the
  // top of the image. Previously used fit:"inside" which preserved the
  // aspect ratio; the grid then had to center-crop via CSS object-cover,
  // which cut off faces and subjects sitting toward the top of a photo.
  // Top-crop here ensures the stored thumb already represents what the
  // viewer sees in a square grid tile.
  let thumbUrl: string | null = null;
  try {
    const thumbBuffer = await sharp(buffer)
      .rotate() // honor EXIF orientation before cropping
      .resize(THUMB_MAX, THUMB_MAX, { fit: "cover", position: "top" })
      .jpeg({ quality: THUMB_QUALITY })
      .toBuffer();

    const { error: thumbError } = await storage.upload(thumbPath, thumbBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

    if (!thumbError) {
      const { data: thumbData } = storage.getPublicUrl(thumbPath);
      thumbUrl = thumbData.publicUrl;
    }
  } catch {
    // Thumbnail generation failed — not fatal, continue without it
  }

  const { data: urlData } = storage.getPublicUrl(path);

  return json({ url: urlData.publicUrl, thumb_url: thumbUrl }, 201);
}
