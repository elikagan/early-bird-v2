import { storage } from "@/lib/storage";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { nanoid } from "nanoid";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

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
  const path = `${user.dealer_id}/${nanoid(12)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await storage.upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return error(`Upload failed: ${uploadError.message}`, 500);
  }

  const { data: urlData } = storage.getPublicUrl(path);

  return json({ url: urlData.publicUrl }, 201);
}
