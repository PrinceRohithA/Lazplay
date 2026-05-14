"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processManager = void 0;
const child_process_1 = require("child_process");
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("../storage/db");
const electron_log_1 = __importDefault(require("electron-log"));
const manager_1 = require("../downloads/manager");
class ProcessManager {
    runningGames = new Map();
    async launchGame(gameId) {
        if (this.runningGames.has(gameId)) {
            throw new Error("Game is already running");
        }
        const game = db_1.db.getGame(gameId);
        if (!game || game.status !== "installed") {
            throw new Error("Game is not installed");
        }
        let entrypoint = game.entrypoint;
        let exePath = entrypoint ? path_1.default.join(game.installPath, entrypoint) : "";
        // Fallback logic
        if (!entrypoint || !fs_1.default.existsSync(exePath)) {
            const fallbacks = ["game.exe", "index.html", "start.bat", "run.sh"];
            let foundFallback = false;
            for (const fallback of fallbacks) {
                const fallbackPath = path_1.default.join(game.installPath, fallback);
                if (fs_1.default.existsSync(fallbackPath)) {
                    electron_log_1.default.info(`Specified entrypoint not found. Falling back to ${fallback}`);
                    exePath = fallbackPath;
                    entrypoint = fallback; // SYNC: Update entrypoint string
                    foundFallback = true;
                    break;
                }
            }
            if (!foundFallback) {
                throw new Error(`Executable not found. Tried ${entrypoint || "nothing"} and common fallbacks.`);
            }
        }
        electron_log_1.default.info(`Launching game ${gameId} from ${exePath}`);
        if (exePath.endsWith(".html") || exePath.endsWith(".htm")) {
            electron_1.shell.openPath(exePath);
            this.runningGames.set(gameId, {
                process: { kill: () => { } },
                startTime: Date.now(),
                runtimePath: "",
                originalPath: game.installPath
            });
            this.broadcastState(gameId, "running");
            // For now, we'll just keep it "running" until the user manually stops it or we implement a window tracker
            return;
        }
        const startTime = Date.now();
        const originalPath = game.installPath;
        const isMasked = entrypoint?.endsWith(".lazplay_locked") || false;
        const runtimePath = path_1.default.join(electron_1.app.getPath("temp"), `LazRuntime_${gameId}_${Math.random().toString(36).substring(7)}`);
        try {
            if (!fs_1.default.existsSync(runtimePath)) {
                fs_1.default.mkdirSync(runtimePath, { recursive: true });
            }
            // MOVE TO RUNTIME PATH: Move everything to the secret temp folder
            const files = fs_1.default.readdirSync(originalPath);
            for (const file of files) {
                fs_1.default.renameSync(path_1.default.join(originalPath, file), path_1.default.join(runtimePath, file));
            }
            electron_log_1.default.info(`Moved ${gameId} to secret runtime path: ${runtimePath}`);
        }
        catch (e) {
            electron_log_1.default.error("Failed to move game to runtime path:", e);
            throw new Error("Security initialization failed");
        }
        const runtimeExePath = path_1.default.join(runtimePath, entrypoint || "");
        let launchPath = runtimeExePath;
        if (isMasked) {
            launchPath = runtimeExePath.replace(".lazplay_locked", "");
            try {
                if (fs_1.default.existsSync(runtimeExePath)) {
                    manager_1.downloadManager.scrambleFile(runtimeExePath); // HEAL: Restore the header
                    fs_1.default.renameSync(runtimeExePath, launchPath);
                    electron_log_1.default.info(`Unmasked and Healed ${gameId} for launch`);
                }
            }
            catch (e) {
                electron_log_1.default.error("Failed to unmask game for launch:", e);
            }
        }
        const exeDir = path_1.default.dirname(launchPath);
        const isExe = launchPath.toLowerCase().endsWith(".exe");
        electron_log_1.default.info(`Launching game ${gameId} from ${launchPath} (CWD: ${exeDir}, shell: ${!isExe})`);
        const child = (0, child_process_1.spawn)(isExe ? launchPath : `"${launchPath}"`, [], {
            cwd: exeDir,
            detached: true,
            stdio: "ignore",
            shell: !isExe,
            env: {
                ...process.env,
                LAZPLAY_SECURE_MODE: "true",
                LAZPLAY_LAUNCH_TOKEN: Buffer.from(`${gameId}-${Date.now()}`).toString('base64'),
                LAZPLAY_INTERNAL_ID: gameId
            }
        });
        child.unref();
        this.runningGames.set(gameId, { process: child, startTime, runtimePath, originalPath });
        this.broadcastState(gameId, "running");
        child.on("error", (err) => {
            electron_log_1.default.error(`Failed to start game ${gameId}:`, err);
            this.handleGameExit(gameId);
        });
        child.on("exit", (code, signal) => {
            electron_log_1.default.info(`Game ${gameId} exited with code ${code} and signal ${signal}`);
            this.handleGameExit(gameId);
        });
    }
    async stopGame(gameId) {
        const running = this.runningGames.get(gameId);
        if (running) {
            electron_log_1.default.info(`Force stopping game ${gameId}`);
            running.process.kill("SIGTERM");
            // Give it time, then SIGKILL if needed
            setTimeout(() => {
                if (this.runningGames.has(gameId)) {
                    running.process.kill("SIGKILL");
                }
            }, 5000);
        }
    }
    getRunningGames() {
        return Array.from(this.runningGames.keys());
    }
    handleGameExit(gameId) {
        const running = this.runningGames.get(gameId);
        if (running) {
            const durationSeconds = Math.floor((Date.now() - running.startTime) / 1000);
            db_1.db.updatePlaytime(gameId, durationSeconds);
            this.runningGames.delete(gameId);
            this.broadcastState(gameId, "stopped");
            // Sync to backend if logged in
            const { token } = db_1.db.getTokens();
            if (token && durationSeconds > 0) {
                fetch(`https://play.lazplay.tech/api/v1/library/${gameId}/session`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ durationSeconds })
                }).catch(err => electron_log_1.default.error("Failed to sync playtime to backend:", err));
            }
            // RE-MASK and MOVE BACK
            const game = db_1.db.getGame(gameId);
            if (running.runtimePath && running.originalPath && fs_1.default.existsSync(running.runtimePath)) {
                try {
                    // First, re-mask the entrypoint while still in temp
                    if (game && game.entrypoint && game.entrypoint.endsWith(".lazplay_locked")) {
                        const unmaskedPath = path_1.default.join(running.runtimePath, game.entrypoint.replace(".lazplay_locked", ""));
                        const maskedPath = path_1.default.join(running.runtimePath, game.entrypoint);
                        if (fs_1.default.existsSync(unmaskedPath)) {
                            manager_1.downloadManager.scrambleFile(unmaskedPath); // PROTECT: Corrupt header
                            fs_1.default.renameSync(unmaskedPath, maskedPath);
                            electron_log_1.default.info(`Re-masked ${gameId} in runtime path`);
                        }
                    }
                    // Move everything back to the official folder
                    const files = fs_1.default.readdirSync(running.runtimePath);
                    for (const file of files) {
                        const dest = path_1.default.join(running.originalPath, file);
                        if (fs_1.default.existsSync(dest))
                            fs_1.default.unlinkSync(dest);
                        fs_1.default.renameSync(path_1.default.join(running.runtimePath, file), dest);
                    }
                    // Delete the secret temp folder
                    fs_1.default.rmSync(running.runtimePath, { recursive: true, force: true });
                    electron_log_1.default.info(`Restored ${gameId} from runtime path and cleaned up`);
                }
                catch (e) {
                    electron_log_1.default.error("Failed to restore game from runtime path:", e);
                }
            }
            this.runningGames.delete(gameId);
            this.broadcastState(gameId, "stopped");
        }
    }
    broadcastState(gameId, state) {
        const windows = electron_1.BrowserWindow.getAllWindows();
        windows.forEach((win) => {
            win.webContents.send("game-state-change", { gameId, state });
            win.webContents.send("store-game-state", { gameId, state });
        });
    }
}
exports.processManager = new ProcessManager();
