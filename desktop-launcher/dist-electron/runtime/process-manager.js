"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
            // For web games, we open them in the system browser (or we could open a new Electron window)
            // Note: Tracking playtime for web games launched this way is difficult
            Promise.resolve().then(() => __importStar(require("electron"))).then(({ shell }) => {
                shell.openPath(exePath);
            });
            this.runningGames.set(gameId, { process: { kill: () => { } }, startTime: Date.now() });
            this.broadcastState(gameId, "running");
            // For now, we'll just keep it "running" until the user manually stops it or we implement a window tracker
            return;
        }
        const startTime = Date.now();
        const child = (0, child_process_1.spawn)(exePath, [], {
            cwd: game.installPath,
            detached: true,
            stdio: "ignore",
            shell: true, // Crucial for some Windows executables and paths with spaces
        });
        child.unref();
        this.runningGames.set(gameId, { process: child, startTime });
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
