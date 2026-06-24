import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Stores an uploaded bill PDF and returns a URL to view it later.
 * Uses Vercel Blob when configured; falls back to local disk under
 * public/uploads for local development without a Blob token.
 */
export async function storeBillFile(filename: string, buffer: Buffer): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`bills/${filename}`, buffer, {
      access: "public",
      contentType: "application/pdf",
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public", "uploads", "bills");
  await mkdir(dir, { recursive: true });
  const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await writeFile(path.join(dir, safeName), buffer);
  return `/uploads/bills/${safeName}`;
}
