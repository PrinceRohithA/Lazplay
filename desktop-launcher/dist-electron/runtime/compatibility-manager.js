"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compatibilityManager = exports.CompatibilityManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const electron_log_1 = __importDefault(require("electron-log"));
class CompatibilityManager {
    isDownloading = false;
    getRuntimesDir() {
        return path_1.default.join(os_1.default.homedir(), ".config/lazplay/runtimes");
    }
    checkProtonInstalled() {
        const runtimesDir = this.getRuntimesDir();
        if (!fs_1.default.existsSync(runtimesDir))
            return false;
        try {
            const files = fs_1.default.readdirSync(runtimesDir);
            for (const file of files) {
                if (file.toLowerCase().includes("proton")) {
                    const protonPath = path_1.default.join(runtimesDir, file, "proton");
                    if (fs_1.default.existsSync(protonPath)) {
                        return true;
                    }
                }
            }
        }
        catch (e) {
            electron_log_1.default.error("Failed to read runtimes directory:", e);
        }
        return false;
    }
    async downloadProton(mainWindow) {
        if (this.isDownloading) {
            electron_log_1.default.warn("Proton download is already in progress.");
            return false;
        }
        this.isDownloading = true;
        const runtimesDir = this.getRuntimesDir();
        const tempTarPath = path_1.default.join(runtimesDir, "proton-temp.tar.gz");
        // Ensure the directories exist
        if (!fs_1.default.existsSync(runtimesDir)) {
            fs_1.default.mkdirSync(runtimesDir, { recursive: true });
        }
        // A high-speed, stable mirror for GE-Proton (latest compatible build)
        const downloadUrl = "https://github.com/GloriousEggroll/proton-ge-custom/releases/download/GE-Proton9-4/GE-Proton9-4.tar.gz";
        electron_log_1.default.info(`[Proton-Downloader] Fetching Proton from: ${downloadUrl}`);
        this.sendProgress(mainWindow, { progress: 0, status: "downloading" });
        try {
            const response = await (0, axios_1.default)({
                url: downloadUrl,
                method: "GET",
                responseType: "stream",
            });
            const totalBytes = parseInt(String(response.headers["content-length"] || "0"), 10);
            let downloadedBytes = 0;
            const writer = fs_1.default.createWriteStream(tempTarPath);
            response.data.on("data", (chunk) => {
                downloadedBytes += chunk.length;
                const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
                this.sendProgress(mainWindow, { progress, status: "downloading" });
            });
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on("finish", () => resolve());
                writer.on("error", (err) => reject(err));
            });
            // 2. Extraction using native Linux 'tar' command to keep it fast, lightweight, and zero-dependency
            electron_log_1.default.info("[Proton-Downloader] Download complete. Extracting tarball...");
            this.sendProgress(mainWindow, { progress: 100, status: "extracting" });
            // Run extraction in background thread
            await new Promise((resolve, reject) => {
                (0, child_process_1.exec)(`tar -xzf "${tempTarPath}" -C "${runtimesDir}"`, (error, stdout, stderr) => {
                    if (error) {
                        electron_log_1.default.error("[Proton-Downloader] Extraction error:", stderr || error.message);
                        reject(new Error(stderr || error.message));
                        return;
                    }
                    resolve();
                });
            });
            // 3. Clean up the temp archive
            if (fs_1.default.existsSync(tempTarPath)) {
                fs_1.default.unlinkSync(tempTarPath);
            }
            // 4. Verify directory name format (Ensure it's named under standard GE-Proton convention)
            const extractedFolder = path_1.default.join(runtimesDir, "GE-Proton9-4");
            const targetFolder = path_1.default.join(runtimesDir, "proton-ge");
            if (fs_1.default.existsSync(extractedFolder)) {
                if (fs_1.default.existsSync(targetFolder)) {
                    fs_1.default.rmSync(targetFolder, { recursive: true, force: true });
                }
                fs_1.default.renameSync(extractedFolder, targetFolder);
                electron_log_1.default.info("[Proton-Downloader] Renamed extracted folder to standard proton-ge path.");
            }
            electron_log_1.default.info("[Proton-Downloader] Proton runtime successfully configured.");
            this.sendProgress(mainWindow, { progress: 100, status: "installed" });
            this.isDownloading = false;
            return true;
        }
        catch (err) {
            electron_log_1.default.error("[Proton-Downloader] Download/Configuration failed:", err);
            this.sendProgress(mainWindow, {
                progress: 0,
                status: "error",
                error: err.message || "Failed to download or extract compatibility tool",
            });
            this.isDownloading = false;
            // Clean up on error
            if (fs_1.default.existsSync(tempTarPath)) {
                try {
                    fs_1.default.unlinkSync(tempTarPath);
                }
                catch (_) { }
            }
            return false;
        }
    }
    sendProgress(mainWindow, data) {
        if (mainWindow && !mainWindow.webContents.isDestroyed()) {
            mainWindow.webContents.send("proton-progress", data);
            mainWindow.webContents.send("store-proton-progress", data);
        }
    }
}
exports.CompatibilityManager = CompatibilityManager;
exports.compatibilityManager = new CompatibilityManager();
