"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIpcHandlers = setupIpcHandlers;
const electron_1 = require("electron");
const manager_1 = require("../downloads/manager");
const process_manager_1 = require("../runtime/process-manager");
const db_1 = require("../storage/db");
const electron_log_1 = __importDefault(require("electron-log"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function setupIpcHandlers(mainWindow, storeView) {
    // Sync Session from website
    electron_1.ipcMain.handle("sync-session", async (event, { token, refreshToken }) => {
        electron_log_1.default.info("Session tokens synced from website");
        // Store tokens securely (e.g. in sqlite or keytar)
        db_1.db.setTokens(token, refreshToken);
        // Alert the native UI about the login state
        mainWindow.webContents.send("session-updated", { loggedIn: true });
        return { success: true };
    });
    // Game Operations
    electron_1.ipcMain.handle("install-game", async (event, gameId, options) => {
        electron_log_1.default.info(`Install requested for game: ${gameId}`, options);
        try {
            await manager_1.downloadManager.startInstall(gameId, options);
            return { success: true };
        }
        catch (error) {
            electron_log_1.default.error(`Install failed for ${gameId}:`, error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("launch-game", async (event, gameId) => {
        electron_log_1.default.info(`Launch requested for game: ${gameId}`);
        try {
            await process_manager_1.processManager.launchGame(gameId);
            return { success: true };
        }
        catch (error) {
            electron_log_1.default.error(`Launch failed for ${gameId}:`, error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("uninstall-game", async (event, gameId) => {
        electron_log_1.default.info(`Uninstall requested for game: ${gameId}`);
        try {
            await process_manager_1.processManager.stopGame(gameId); // Force stop if running
            await manager_1.downloadManager.uninstall(gameId);
            return { success: true };
        }
        catch (error) {
            electron_log_1.default.error(`Uninstall failed for ${gameId}:`, error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("pause-download", async (event, gameId) => {
        return manager_1.downloadManager.pauseDownload(gameId);
    });
    electron_1.ipcMain.handle("resume-download", async (event, gameId) => {
        return manager_1.downloadManager.resumeDownload(gameId);
    });
    electron_1.ipcMain.handle("set-game-entrypoint", async (event, gameId, entrypoint) => {
        electron_log_1.default.info(`Setting entrypoint for game ${gameId}: ${entrypoint}`);
        db_1.db.setGameStatus(gameId, "installed", { entrypoint });
        return { success: true };
    });
    electron_1.ipcMain.handle("open-install-folder", async (event, gameId) => {
        const game = db_1.db.getGame(gameId);
        if (game && game.installPath) {
            const targetPath = game.entrypoint
                ? path_1.default.join(game.installPath, game.entrypoint)
                : game.installPath;
            if (fs_1.default.existsSync(targetPath)) {
                electron_1.shell.showItemInFolder(targetPath);
            }
            else {
                electron_1.shell.openPath(game.installPath);
            }
            return true;
        }
        return false;
    });
    // State queries
    electron_1.ipcMain.handle("get-installed-games", () => {
        return db_1.db.getInstalledGames();
    });
    electron_1.ipcMain.handle("get-running-games", () => {
        return process_manager_1.processManager.getRunningGames();
    });
    electron_1.ipcMain.handle("get-download-progress", (event, gameId) => {
        return manager_1.downloadManager.getProgress(gameId);
    });
    electron_1.ipcMain.handle("get-disk-usage", async () => {
        // Basic implementation, you'd use a robust disk space library here
        return {
            free: 100000000000,
            total: 500000000000,
        };
    });
    electron_1.ipcMain.handle("set-store-visibility", (event, visible) => {
        if (storeView && mainWindow) {
            if (visible) {
                mainWindow.contentView.addChildView(storeView);
            }
            else {
                mainWindow.contentView.removeChildView(storeView);
            }
        }
    });
    electron_1.ipcMain.handle("sync-remote-library", async () => {
        // Strategy 1: Read token directly from the store WebContentsView's localStorage.
        // This is the most reliable approach — the user is already logged in on the store tab,
        // so the token is right there without needing a prior sync-session call.
        let token = null;
        if (storeView && !storeView.webContents.isDestroyed()) {
            try {
                token = await storeView.webContents.executeJavaScript(`localStorage.getItem('accessToken')`);
                if (token)
                    electron_log_1.default.info("Token read from storeView localStorage ✓");
            }
            catch (e) {
                electron_log_1.default.warn("Could not read token from storeView:", e);
            }
        }
        // Strategy 2: Fall back to SQLite-stored token (from sync-session)
        if (!token) {
            const stored = db_1.db.getTokens();
            token = stored.token || null;
            if (token)
                electron_log_1.default.info("Token read from SQLite ✓");
        }
        if (!token) {
            electron_log_1.default.warn("sync-remote-library: No token found. User must log in via the Store tab.");
            return { success: false, error: "Not logged in — please log in on the Store tab first." };
        }
        try {
            const libRes = await fetch("https://play.lazplay.tech/api/v1/library", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!libRes.ok) {
                const text = await libRes.text();
                electron_log_1.default.error(`Library fetch failed (${libRes.status}):`, text);
                throw new Error(`Library fetch failed: ${libRes.status}`);
            }
            const libData = await libRes.json();
            electron_log_1.default.info("Library raw response:", JSON.stringify(libData).slice(0, 500));
            // Normalise to array — handle {data:[]}, {items:[]}, or bare array
            const ownedItems = libData.data || libData.items || (Array.isArray(libData) ? libData : []);
            electron_log_1.default.info(`Library items count: ${ownedItems.length}`);
            // Each library item: game details may be nested under .game, or flat at top level
            const WEB_PLATFORMS = new Set(["WEB", "BROWSER", "HTML5"]);
            const ownedGames = ownedItems
                .map((entry) => {
                const game = entry.game || entry;
                const id = String(game.id || game.gameId || entry.gameId);
                const platforms = (game.platforms || entry.platforms || []).map((p) => p.toUpperCase());
                return {
                    id,
                    title: game.title || entry.title || id,
                    downloadUrl: game.downloadUrl || game.buildUrl || null,
                    entrypoint: game.entrypoint || null,
                    coverUrl: game.coverImageUrl || game.coverUrl || null,
                    bannerUrl: game.bannerUrl || game.heroBannerUrl || game.heroImageUrl || null,
                    playtime: game.playtimeSeconds || 0,
                    lastPlayed: game.lastPlayedAt ? new Date(game.lastPlayedAt).getTime() : null,
                    size: game.size || 0,
                    platforms,
                    isOwned: true,
                };
            })
                // Exclude games that are ONLY playable in a browser — they don't need the launcher
                .filter((g) => {
                if (g.platforms.length === 0)
                    return true; // unknown platform — include by default
                return g.platforms.some((p) => !WEB_PLATFORMS.has(p));
            });
            // Also persist the token for future use (so later calls work even if store view is hidden)
            if (token)
                db_1.db.setTokens(token, db_1.db.getTokens().refreshToken || "");
            return {
                success: true,
                ownedIds: ownedGames.map((g) => g.id),
                allGames: ownedGames,
            };
        }
        catch (error) {
            electron_log_1.default.error("Sync library failed:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("claim-game", async (event, gameId) => {
        const { token } = db_1.db.getTokens();
        if (!token)
            return { success: false, error: "Not logged in" };
        try {
            const response = await fetch("https://play.lazplay.tech/api/v1/library", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ gameId }),
            });
            if (!response.ok)
                throw new Error("Claim failed");
            return { success: true };
        }
        catch (error) {
            electron_log_1.default.error("Claim failed:", error);
            return { success: false, error: error.message };
        }
    });
}
