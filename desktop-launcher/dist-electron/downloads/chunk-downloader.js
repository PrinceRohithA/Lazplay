"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkDownloader = exports.ChunkDownloader = void 0;
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const electron_log_1 = __importDefault(require("electron-log"));
const launcher_1 = require("@lazplay/distribution/launcher");
const chunk_cache_1 = require("./chunk-cache");
const API_BASE = process.env.LAZPLAY_API_URL || "https://play.lazplay.tech/api/v1";
class ChunkDownloader {
    async fetchManifest(gameId, token) {
        const res = await axios_1.default.get(`${API_BASE}/games/${gameId}/distribution-manifest`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data?.data ?? res.data;
        return { manifest: data.manifest, entrypoint: data.entrypoint };
    }
    async getDownloadUrls(gameId, token, hashes) {
        const res = await axios_1.default.post(`${API_BASE}/games/${gameId}/chunks/download-urls`, { hashes }, { headers: { Authorization: `Bearer ${token}` } });
        const urls = res.data?.data?.urls ?? res.data?.urls ?? [];
        const map = new Map();
        for (const item of urls) {
            map.set(item.hash, item.url);
        }
        return map;
    }
    async installFromChunks(options, installPath) {
        const chunkDir = (0, chunk_cache_1.getChunksCacheDir)();
        const fetchManifest = async (gameId) => {
            const result = await this.fetchManifest(gameId, options.token);
            (0, chunk_cache_1.saveManifest)(gameId, result.manifest);
            return result;
        };
        const getDownloadUrls = async (gameId, hashes) => {
            return this.getDownloadUrls(gameId, options.token, hashes);
        };
        const downloadChunk = async (hash, url, destPath) => {
            (0, chunk_cache_1.ensureCacheDirs)();
            const response = await (0, axios_1.default)({
                url,
                method: "GET",
                responseType: "stream",
            });
            const writer = fs_1.default.createWriteStream(destPath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on("finish", () => resolve());
                writer.on("error", reject);
            });
        };
        const result = await (0, launcher_1.runDownloadPipeline)({
            gameId: options.gameId,
            installPath,
            chunkDir,
            fetchManifest,
            getDownloadUrls,
            downloadChunk,
            onProgress: (progress, downloadedCount, totalCount) => {
                options.onProgress?.(progress, downloadedCount, totalCount);
            }
        });
        electron_log_1.default.info(`Chunk install complete for ${options.gameId}`);
        return { entrypoint: result.entrypoint || options.entrypoint || null };
    }
    /** Verify local install and re-download corrupted chunks only (repair). */
    async repair(gameId, token, installPath) {
        const chunkDir = (0, chunk_cache_1.getChunksCacheDir)();
        const fetchManifest = async (gId) => {
            return this.fetchManifest(gId, token);
        };
        const getDownloadUrls = async (gId, hashes) => {
            return this.getDownloadUrls(gId, token, hashes);
        };
        const downloadChunk = async (hash, url, destPath) => {
            (0, chunk_cache_1.ensureCacheDirs)();
            const response = await (0, axios_1.default)({
                url,
                method: "GET",
                responseType: "stream",
            });
            const writer = fs_1.default.createWriteStream(destPath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on("finish", () => resolve());
                writer.on("error", reject);
            });
        };
        await (0, launcher_1.runDownloadPipeline)({
            gameId,
            installPath,
            chunkDir,
            fetchManifest,
            getDownloadUrls,
            downloadChunk
        });
        electron_log_1.default.info(`Repair complete for ${gameId}`);
    }
}
exports.ChunkDownloader = ChunkDownloader;
exports.chunkDownloader = new ChunkDownloader();
