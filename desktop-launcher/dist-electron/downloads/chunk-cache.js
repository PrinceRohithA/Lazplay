"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheRoot = getCacheRoot;
exports.getChunksCacheDir = getChunksCacheDir;
exports.getManifestsCacheDir = getManifestsCacheDir;
exports.getTempCacheDir = getTempCacheDir;
exports.ensureCacheDirs = ensureCacheDirs;
exports.chunkPath = chunkPath;
exports.hasChunk = hasChunk;
exports.listCachedChunkHashes = listCachedChunkHashes;
exports.saveManifest = saveManifest;
exports.loadManifest = loadManifest;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function getCacheRoot() {
    return path_1.default.join(electron_1.app.getPath("userData"), "cache");
}
function getChunksCacheDir() {
    return path_1.default.join(getCacheRoot(), "chunks");
}
function getManifestsCacheDir() {
    return path_1.default.join(getCacheRoot(), "manifests");
}
function getTempCacheDir() {
    return path_1.default.join(getCacheRoot(), "temp");
}
function ensureCacheDirs() {
    for (const dir of [getChunksCacheDir(), getManifestsCacheDir(), getTempCacheDir()]) {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
}
function chunkPath(hash) {
    return path_1.default.join(getChunksCacheDir(), hash);
}
function hasChunk(hash) {
    return fs_1.default.existsSync(chunkPath(hash));
}
function listCachedChunkHashes() {
    ensureCacheDirs();
    const dir = getChunksCacheDir();
    return fs_1.default.readdirSync(dir).filter((f) => !f.startsWith("."));
}
function saveManifest(gameId, manifest) {
    ensureCacheDirs();
    const filePath = path_1.default.join(getManifestsCacheDir(), `${gameId}.json`);
    fs_1.default.writeFileSync(filePath, JSON.stringify(manifest, null, 2));
}
function loadManifest(gameId) {
    const filePath = path_1.default.join(getManifestsCacheDir(), `${gameId}.json`);
    if (!fs_1.default.existsSync(filePath))
        return null;
    return JSON.parse(fs_1.default.readFileSync(filePath, "utf-8"));
}
