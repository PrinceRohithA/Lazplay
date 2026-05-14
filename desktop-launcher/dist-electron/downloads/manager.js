"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadManager = void 0;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../storage/db");
const electron_log_1 = __importDefault(require("electron-log"));
const axios_1 = __importDefault(require("axios"));
const adm_zip_1 = __importDefault(require("adm-zip"));
class DownloadManager {
    activeDownloads = new Map();
    async startInstall(gameId, options) {
        const installPath = path_1.default.join(electron_1.app.getPath("userData"), "installed-games", gameId);
        if (!fs_1.default.existsSync(installPath)) {
            fs_1.default.mkdirSync(installPath, { recursive: true });
        }
        db_1.db.setGameStatus(gameId, "downloading", {
            title: options.title || `Game ${gameId}`,
            installPath: installPath,
            entrypoint: options.entrypoint
        });
        const cdnUrl = options.downloadUrl;
        if (!cdnUrl) {
            throw new Error("No download URL provided for game");
        }
        this.downloadFile(gameId, cdnUrl, path_1.default.join(installPath, "game.zip"), options);
    }
    async downloadFile(gameId, url, destination, options) {
        electron_log_1.default.info(`Starting download for ${gameId} to ${destination}`);
        const abortController = new AbortController();
        const writer = fs_1.default.createWriteStream(destination);
        try {
            const response = await (0, axios_1.default)({
                url,
                method: 'GET',
                responseType: 'stream',
                signal: abortController.signal
            });
            const totalBytes = parseInt(String(response.headers['content-length'] || '0'), 10);
            let downloadedBytes = 0;
            response.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
                this.broadcastProgress({
                    gameId,
                    progress: Math.min(progress, 100),
                    downloadedBytes,
                    totalBytes,
                    status: "downloading",
                });
            });
            response.data.pipe(writer);
            this.activeDownloads.set(gameId, { abort: abortController, stream: writer });
            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    this.finishDownload(gameId, destination, options);
                    resolve(true);
                });
                writer.on('error', reject);
            });
        }
        catch (error) {
            electron_log_1.default.error(`Download failed for ${gameId}:`, error);
            this.broadcastProgress({
                gameId,
                progress: 0,
                downloadedBytes: 0,
                totalBytes: 0,
                status: "error"
            });
            throw error;
        }
    }
    finishDownload(gameId, filePath, options) {
        this.activeDownloads.delete(gameId);
        electron_log_1.default.info(`Download finished for ${gameId}. Starting extraction...`);
        try {
            const zip = new adm_zip_1.default(filePath);
            const extractPath = path_1.default.dirname(filePath);
            zip.extractAllTo(extractPath, true);
            // Remove the zip after extraction
            fs_1.default.unlinkSync(filePath);
            electron_log_1.default.info(`Extraction complete for ${gameId}. Verifying entrypoint...`);
            // Try to find the entrypoint
            let entrypoint = options.entrypoint;
            const fullExePath = entrypoint ? path_1.default.join(extractPath, entrypoint) : "";
            if (!entrypoint || !fs_1.default.existsSync(fullExePath)) {
                electron_log_1.default.warn(`Entrypoint ${entrypoint} not found in ${extractPath}. Scanning for executables...`);
                const files = this.getAllFiles(extractPath);
                const exes = files.filter(f => f.endsWith(".exe") || f.endsWith(".sh") || f.endsWith(".bat") || f.endsWith(".app"));
                if (exes.length === 1) {
                    entrypoint = path_1.default.relative(extractPath, exes[0]);
                    electron_log_1.default.info(`Auto-detected entrypoint: ${entrypoint}`);
                    // MASKING: Hide the executable
                    const originalPath = path_1.default.join(extractPath, entrypoint);
                    const maskedEntrypoint = entrypoint + ".lazplay_locked";
                    const maskedPath = originalPath + ".lazplay_locked";
                    try {
                        fs_1.default.renameSync(originalPath, maskedPath);
                        this.scrambleFile(maskedPath); // PROTECT: Corrupt the header
                        db_1.db.setGameStatus(gameId, "installed", { entrypoint: maskedEntrypoint });
                    }
                    catch (e) {
                        electron_log_1.default.error("Failed to mask entrypoint:", e);
                        db_1.db.setGameStatus(gameId, "installed", { entrypoint });
                    }
                }
                else {
                    electron_log_1.default.warn(`Found ${exes.length} potential executables. Prompting user...`);
                    db_1.db.setGameStatus(gameId, "paused", { statusText: "Requires Setup" });
                    // Notify UI to ask user
                    const windows = electron_1.BrowserWindow.getAllWindows();
                    windows.forEach(win => {
                        win.webContents.send("request-entrypoint", {
                            gameId,
                            title: options.title,
                            potentialEntrypoints: exes.map(f => path_1.default.relative(extractPath, f))
                        });
                    });
                    this.broadcastProgress({
                        gameId,
                        progress: 100,
                        downloadedBytes: 1,
                        totalBytes: 1,
                        status: "paused",
                    });
                    return; // Stop here, wait for user input
                }
            }
            else {
                // MASKING: Hide the executable even if provided in options
                const originalPath = path_1.default.join(extractPath, entrypoint);
                const maskedEntrypoint = entrypoint + ".lazplay_locked";
                const maskedPath = originalPath + ".lazplay_locked";
                if (fs_1.default.existsSync(originalPath)) {
                    try {
                        fs_1.default.renameSync(originalPath, maskedPath);
                        this.scrambleFile(maskedPath); // PROTECT: Corrupt the header
                        db_1.db.setGameStatus(gameId, "installed", { entrypoint: maskedEntrypoint });
                    }
                    catch (e) {
                        electron_log_1.default.error("Failed to mask provided entrypoint:", e);
                        db_1.db.setGameStatus(gameId, "installed", { entrypoint });
                    }
                }
                else if (fs_1.default.existsSync(maskedPath)) {
                    // Already masked
                    db_1.db.setGameStatus(gameId, "installed", { entrypoint: maskedEntrypoint });
                }
                else {
                    db_1.db.setGameStatus(gameId, "installed", { entrypoint });
                }
            }
            this.broadcastProgress({
                gameId,
                progress: 100,
                downloadedBytes: 1,
                totalBytes: 1,
                status: "installed",
            });
        }
        catch (error) {
            electron_log_1.default.error(`Extraction failed for ${gameId}:`, error);
            db_1.db.setGameStatus(gameId, "corrupted");
            this.broadcastProgress({
                gameId,
                progress: 0,
                downloadedBytes: 0,
                totalBytes: 0,
                status: "corrupted",
            });
        }
    }
    getAllFiles(dirPath, arrayOfFiles = []) {
        const files = fs_1.default.readdirSync(dirPath);
        files.forEach((file) => {
            if (fs_1.default.statSync(path_1.default.join(dirPath, file)).isDirectory()) {
                arrayOfFiles = this.getAllFiles(path_1.default.join(dirPath, file), arrayOfFiles);
            }
            else {
                arrayOfFiles.push(path_1.default.join(dirPath, file));
            }
        });
        return arrayOfFiles;
    }
    scrambleFile(filePath) {
        try {
            const stats = fs_1.default.statSync(filePath);
            if (stats.size < 1024)
                return; // Too small to scramble safely
            const fd = fs_1.default.openSync(filePath, 'r+');
            const buffer = Buffer.alloc(1024);
            fs_1.default.readSync(fd, buffer, 0, 1024, 0);
            // Simple XOR scramble
            for (let i = 0; i < buffer.length; i++) {
                buffer[i] = buffer[i] ^ 0x42; // The LazPlay Secret Key
            }
            fs_1.default.writeSync(fd, buffer, 0, 1024, 0);
            fs_1.default.closeSync(fd);
            electron_log_1.default.info(`Scrambled/Unscrambled header for ${path_1.default.basename(filePath)}`);
        }
        catch (e) {
            electron_log_1.default.error("Scrambling failed:", e);
        }
    }
    async pauseDownload(gameId) {
        const active = this.activeDownloads.get(gameId);
        if (active) {
            active.abort.abort();
            active.stream.close();
            this.activeDownloads.delete(gameId);
            db_1.db.setGameStatus(gameId, "paused");
            electron_log_1.default.info(`Paused download for ${gameId}`);
            return true;
        }
        return false;
    }
    async resumeDownload(gameId) {
        const game = db_1.db.getGame(gameId);
        if (game && game.status === "paused") {
            db_1.db.setGameStatus(gameId, "downloading");
            electron_log_1.default.info(`Resuming download for ${gameId}`);
            // In a real app, you'd fetch the latest downloadUrl again
            // For now, we'll re-start the install if we have the URL stored or passed
            return true;
        }
        return false;
    }
    async uninstall(gameId) {
        const game = db_1.db.getGame(gameId);
        if (game && game.installPath) {
            if (fs_1.default.existsSync(game.installPath)) {
                fs_1.default.rmSync(game.installPath, { recursive: true, force: true });
            }
            db_1.db.removeGame(gameId);
            electron_log_1.default.info(`Uninstalled game ${gameId}`);
        }
    }
    getProgress(gameId) {
        return null; // Mock
    }
    broadcastProgress(data) {
        const windows = electron_1.BrowserWindow.getAllWindows();
        windows.forEach((win) => {
            win.webContents.send("download-progress", data);
            win.webContents.send("store-download-progress", data);
        });
    }
}
exports.downloadManager = new DownloadManager();
