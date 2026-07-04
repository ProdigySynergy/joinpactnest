import { mkdir, writeFile } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";

const ALLOWED_MIMES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function saveUpload(
  userId: string,
  buffer: Buffer,
  mimeType: string,
  purpose: "avatar" | "proof"
): Promise<{ url: string; fileId: string }> {
  const ext = ALLOWED_MIMES[mimeType];
  if (!ext) throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP, GIF");

  const maxBytes = env.maxUploadSizeMb * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new Error(`File too large. Max ${env.maxUploadSizeMb}MB`);
  }

  const subdir = purpose === "avatar" ? "avatars" : "proofs";
  const dir = join(env.uploadDir, subdir);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}${ext}`;
  const filepath = join(dir, filename);
  await writeFile(filepath, buffer);

  const file = await prisma.uploadedFile.create({
    data: {
      userId,
      filename,
      path: join(subdir, filename),
      mimeType,
      size: buffer.length,
      purpose,
    },
  });

  return {
    url: `${env.apiPublicUrl}/uploads/${subdir}/${filename}`,
    fileId: file.id,
  };
}
