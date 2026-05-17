"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patcher = exports.PatchManager = void 0;
const electron_log_1 = __importDefault(require("electron-log"));
const launcher_1 = require("@lazplay/distribution/launcher");
const chunk_cache_1 = require("../downloads/chunk-cache");
const chunk_downloader_1 = require("../downloads/chunk-downloader");
const db_1 = require("../storage/db");
/**
 * Chunk-based repair: verify cached chunks against manifest hashes,
 * re-download corrupted/missing chunks only, then reassemble.
 */
class PatchManager {
    async repairGame(gameId, token) {
        const game = db_1.db.getGame(gameId);
        if (!game?.installPath) {
            throw new Error("Game is not installed");
        }
        const manifest = (0, chunk_cache_1.loadManifest)(gameId);
        if (!manifest) {
            electron_log_1.default.info(`No local manifest for ${gameId}, fetching from server`);
            await chunk_downloader_1.chunkDownloader.repair(gameId, token, game.installPath);
            return;
        }
        const missing = await (0, launcher_1.getMissingChunks)(manifest, (0, chunk_cache_1.getChunksCacheDir)());
        if (missing.length === 0) {
            electron_log_1.default.info(`All chunks valid for ${gameId}`);
            return;
        }
        electron_log_1.default.info(`Repairing ${missing.length} chunks for ${gameId}`);
        await chunk_downloader_1.chunkDownloader.repair(gameId, token, game.installPath);
    }
    async verifyChunk(hash) {
        const filePath = `${(0, chunk_cache_1.getChunksCacheDir)()}/${hash}`;
        try {
            await (0, launcher_1.verifyChunkFile)(filePath, hash);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.PatchManager = PatchManager;
exports.patcher = new PatchManager();
