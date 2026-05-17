import { app } from "electron";
import fs from "fs";
import path from "path";

export function getCacheRoot(): string {
  return path.join(app.getPath("userData"), "cache");
}

export function getChunksCacheDir(): string {
  return path.join(getCacheRoot(), "chunks");
}

export function getManifestsCacheDir(): string {
  return path.join(getCacheRoot(), "manifests");
}

export function getTempCacheDir(): string {
  return path.join(getCacheRoot(), "temp");
}

export function ensureCacheDirs(): void {
  for (const dir of [getChunksCacheDir(), getManifestsCacheDir(), getTempCacheDir()]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function chunkPath(hash: string): string {
  return path.join(getChunksCacheDir(), hash);
}

export function hasChunk(hash: string): boolean {
  return fs.existsSync(chunkPath(hash));
}

export function listCachedChunkHashes(): string[] {
  ensureCacheDirs();
  const dir = getChunksCacheDir();
  return fs.readdirSync(dir).filter((f) => !f.startsWith("."));
}

export function saveManifest(gameId: string, manifest: object): void {
  ensureCacheDirs();
  const filePath = path.join(getManifestsCacheDir(), `${gameId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));
}

export function loadManifest(gameId: string): object | null {
  const filePath = path.join(getManifestsCacheDir(), `${gameId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
