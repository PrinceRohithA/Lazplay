import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "../config/env.js";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "game";
}

function sanitizeVersion(version) {
  return String(version || "1").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function ensureStorageDirectory() {
  await fs.mkdir(env.GAME_STORAGE_DIR, { recursive: true });
}

export async function moveUploadedFileToStorage({ tempPath, originalName, gameName, version }) {
  const extension = path.extname(String(originalName || "")).toLowerCase() || ".zip";
  const safeBaseName = slugify(gameName);
  const safeVersion = sanitizeVersion(version);
  const uniqueSuffix = crypto.randomBytes(4).toString("hex");
  const finalFileName = `${safeBaseName}_v${safeVersion}_${uniqueSuffix}${extension}`;
  const targetPath = path.join(env.GAME_STORAGE_DIR, finalFileName);

  await fs.rename(tempPath, targetPath);

  const stats = await fs.stat(targetPath);

  return {
    fileName: finalFileName,
    absolutePath: targetPath,
    size: Number(stats.size)
  };
}
