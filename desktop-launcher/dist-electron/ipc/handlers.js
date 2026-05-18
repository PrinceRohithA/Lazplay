"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIpcHandlers = setupIpcHandlers;
const electron_1 = require("electron");
const manager_1 = require("../downloads/manager");
const process_manager_1 = require("../runtime/process-manager");
const compatibility_manager_1 = require("../runtime/compatibility-manager");
const db_1 = require("../storage/db");
const electron_log_1 = __importDefault(require("electron-log"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function setupIpcHandlers(mainWindow, storeView) {
    // Sync Session from website or native login
    electron_1.ipcMain.handle("sync-session", async (event, { token, refreshToken }) => {
        electron_log_1.default.info("Session tokens synced and saved");
        // Store tokens securely in SQLite
        db_1.db.setTokens(token, refreshToken);
        // Inject tokens into storeView immediately if active
        if (storeView && !storeView.webContents.isDestroyed()) {
            try {
                await storeView.webContents.executeJavaScript(`
          localStorage.setItem('accessToken', ${JSON.stringify(token)});
          localStorage.setItem('refreshToken', ${JSON.stringify(refreshToken || '')});
          window.dispatchEvent(new Event('storage'));
        `);
                electron_log_1.default.info("sync-session: Tokens injected into active storeView");
            }
            catch (err) {
                electron_log_1.default.error("sync-session: Failed to inject tokens into active storeView:", err);
            }
        }
        // Alert the native UI about the login state
        mainWindow.webContents.send("session-updated", { loggedIn: true });
        return { success: true };
    });
    // Check if session is valid
    electron_1.ipcMain.handle("check-auth", async () => {
        const { token } = db_1.db.getTokens();
        if (!token) {
            electron_log_1.default.info("check-auth: No stored token found");
            return { success: false };
        }
        try {
            electron_log_1.default.info("check-auth: Verifying token with backend...");
            const response = await fetch("https://play.lazplay.tech/api/v1/auth/me", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const result = await response.json();
                const user = result.data || result;
                electron_log_1.default.info("check-auth: Token verified successfully for user:", user.username || user.email);
                return { success: true, user };
            }
            else {
                electron_log_1.default.warn(`check-auth: Token verification failed with status ${response.status}`);
                return { success: false };
            }
        }
        catch (error) {
            electron_log_1.default.error("check-auth: Failed to reach auth endpoint:", error.message);
            // In case of network errors but we have a token, we might still return the active state or offline state.
            // For now, let's require successful authentication.
            return { success: false, error: "Network error" };
        }
    });
    // Clear Session (Logout)
    electron_1.ipcMain.handle("clear-session", async () => {
        electron_log_1.default.info("clear-session: Logging out user, clearing SQLite tokens...");
        db_1.db.setTokens("", "");
        if (storeView && !storeView.webContents.isDestroyed()) {
            try {
                await storeView.webContents.executeJavaScript(`
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.dispatchEvent(new Event('storage'));
        `);
                electron_log_1.default.info("clear-session: Successfully cleared tokens from storeView localStorage");
            }
            catch (e) {
                electron_log_1.default.warn("clear-session: Failed to clear tokens from storeView:", e);
            }
        }
        mainWindow.webContents.send("session-updated", { loggedIn: false });
        return { success: true };
    });
    // Game Operations
    electron_1.ipcMain.handle("install-game", async (event, gameId, options) => {
        electron_log_1.default.info(`Install requested for game: ${gameId}`, options);
        try {
            const { token } = db_1.db.getTokens();
            if (options?.usesChunkDistribution && token) {
                options.token = token;
            }
            await manager_1.downloadManager.startInstall(gameId, options);
            return { success: true };
        }
        catch (error) {
            electron_log_1.default.error(`Install failed for ${gameId}:`, error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("repair-game", async (event, gameId) => {
        const { token } = db_1.db.getTokens();
        if (!token)
            return { success: false, error: "Not authenticated" };
        try {
            await manager_1.downloadManager.repairGame(gameId, token);
            return { success: true };
        }
        catch (error) {
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
                // Explicitly set bounds immediately to prevent Electron from auto-stretching/covering top bar
                const bounds = mainWindow.getContentBounds();
                storeView.setBounds({
                    x: 0,
                    y: 64,
                    width: bounds.width,
                    height: bounds.height - 64,
                });
            }
            else {
                mainWindow.contentView.removeChildView(storeView);
            }
        }
    });
    electron_1.ipcMain.handle("navigate-store-path", async (event, path) => {
        if (storeView && !storeView.webContents.isDestroyed()) {
            try {
                const fullUrl = `https://play.lazplay.tech${path}`;
                electron_log_1.default.info(`navigate-store-path: Navigating storeView to ${fullUrl}`);
                await storeView.webContents.loadURL(fullUrl);
                return { success: true };
            }
            catch (err) {
                electron_log_1.default.error(`navigate-store-path failed for ${path}:`, err.message);
                return { success: false, error: err.message };
            }
        }
        return { success: false, error: "Storefront view not available" };
    });
    electron_1.ipcMain.handle("get-access-token", () => {
        return db_1.db.getTokens().token || null;
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
                    downloadUrl: game.downloadUrl || game.buildUrl || entry.downloadUrl || entry.buildUrl || null,
                    usesChunkDistribution: game.usesChunkDistribution || entry.usesChunkDistribution || false,
                    entrypoint: game.entrypoint || entry.entrypoint || null,
                    coverUrl: game.coverUrl || game.coverImageUrl || entry.coverUrl || entry.coverImageUrl || game.heroImageUrl || entry.heroImageUrl || null,
                    bannerUrl: game.bannerUrl || game.heroBannerUrl || game.heroImageUrl || entry.bannerUrl || entry.heroBannerUrl || entry.heroImageUrl || null,
                    playtime: game.playtimeSeconds || entry.playtimeSeconds || 0,
                    lastPlayed: game.lastPlayedAt ? new Date(game.lastPlayedAt).getTime() : entry.lastPlayedAt ? new Date(entry.lastPlayedAt).getTime() : null,
                    size: game.size || entry.size || 0,
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
            // Synchronize SQLite cover/banner images for any locally registered games
            ownedGames.forEach((g) => {
                const local = db_1.db.getGame(g.id);
                if (local) {
                    db_1.db.setGameStatus(g.id, local.status, {
                        coverUrl: g.coverUrl || local.coverUrl,
                        bannerUrl: g.bannerUrl || local.bannerUrl
                    });
                }
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
    // Select Folder dialog for Creator Workspace (chunked uploads)
    electron_1.ipcMain.handle("select-folder", async () => {
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            properties: ["openDirectory", "createDirectory"],
            title: "Select Build Directory"
        });
        if (result.canceled)
            return null;
        return result.filePaths[0];
    });
    // Client-side high performance chunked uploader pipeline
    electron_1.ipcMain.handle("upload-build-directory", async (event, { gameId, buildId, folderPath, platform, version }) => {
        const { token } = db_1.db.getTokens();
        if (!token)
            throw new Error("Authentication token not found. Please log in first.");
        try {
            electron_log_1.default.info(`Staging chunked build pipeline for game ${gameId}, build ${buildId} on folder: ${folderPath}`);
            // Dynamic import to prevent CommonJS ERR_REQUIRE_ESM at runtime
            const { runUploadPipeline } = await eval('import("@lazplay/distribution")');
            const requestApi = async (method, endpoint, body) => {
                const res = await fetch(`https://play.lazplay.tech/api/v1${endpoint}`, {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: body ? JSON.stringify(body) : undefined
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(json.error?.message || `API Error ${res.status}: ${endpoint}`);
                }
                return json.data ?? json;
            };
            const uploadChunkToUrl = async (uploadUrl, chunkBuffer) => {
                const uploadRes = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": "application/octet-stream" },
                    body: chunkBuffer
                });
                if (!uploadRes.ok) {
                    throw new Error(`Failed to transmit chunk to R2 (Status: ${uploadRes.status})`);
                }
            };
            const result = await runUploadPipeline({
                gameId,
                buildId,
                folderPath,
                platform,
                version,
                requestApi,
                uploadChunkToUrl,
                onProgress: (progress, status) => {
                    mainWindow.webContents.send("upload-progress", { buildId, progress, status });
                }
            });
            electron_log_1.default.info(`Chunked build deployment complete! Manifest: ${result.manifestObjectKey}`);
            return { success: true, manifestObjectKey: result.manifestObjectKey };
        }
        catch (err) {
            electron_log_1.default.error(`Chunked build deployment failed:`, err);
            mainWindow.webContents.send("upload-progress", { buildId, progress: 0, status: `ERROR: ${err.message}` });
            return { success: false, error: err.message };
        }
    });
    // Compatibility and Proton layer handling
    electron_1.ipcMain.handle("check-proton-status", () => {
        try {
            const isInstalled = compatibility_manager_1.compatibilityManager.checkProtonInstalled() || process_manager_1.processManager.findProtonPath() !== null;
            return { success: true, isInstalled };
        }
        catch (error) {
            electron_log_1.default.error("Failed to check proton status:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("download-proton", async () => {
        electron_log_1.default.info("Proton download requested via IPC");
        try {
            const success = await compatibility_manager_1.compatibilityManager.downloadProton(mainWindow);
            return { success };
        }
        catch (error) {
            electron_log_1.default.error("Proton download handler failed:", error);
            return { success: false, error: error.message };
        }
    });
}
