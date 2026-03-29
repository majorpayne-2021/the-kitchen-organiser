import sharp from "sharp";
import { randomUUID } from "crypto";
import path from "path";
import { unlink } from "fs/promises";

const THUMB_SIZE = 400;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

export function generateFilename(ext: string): string {
  return `${randomUUID().replace(/-/g, "")}.${ext.toLowerCase()}`;
}

export function getThumbFilename(filename: string): string {
  return `thumb_${filename}`;
}

export function isAllowedExtension(ext: string): boolean {
  return ALLOWED_EXTENSIONS.has(ext.toLowerCase());
}

export async function processAndSavePhoto(
  buffer: Buffer,
  ext: string,
  outputDir: string,
  prefix: string = ""
): Promise<string> {
  const filename = `${prefix}${generateFilename(ext)}`;
  const filepath = path.join(outputDir, filename);
  const thumbPath = path.join(outputDir, getThumbFilename(filename));

  await sharp(buffer).rotate().toFile(filepath);
  await sharp(buffer)
    .rotate()
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: "inside" })
    .toFile(thumbPath);

  return filename;
}

export async function deletePhoto(
  filename: string,
  photoDir: string
): Promise<void> {
  const filepath = path.join(photoDir, filename);
  const thumbPath = path.join(photoDir, getThumbFilename(filename));
  await unlink(filepath).catch(() => {});
  await unlink(thumbPath).catch(() => {});
}
