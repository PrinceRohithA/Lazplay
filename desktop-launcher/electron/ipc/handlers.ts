import { ipcMain, BrowserWindow, WebContentsView, shell, dialog } from "electron";
import { downloadManager } from "../downloads/manager";
import { processManager } from "../runtime/process-manager";
import { compatibilityManager } from "../runtime/compatibility-manager";
import { db } from "../storage/db";
import log from "electron-log";
import fs from "fs";
import path from "path";

export function setupIpcHandlers(
  mainWindow: BrowserWindow,
  storeView: WebContentsView | null,
) {
  // Sync Session from website or native login
  ipcMain.handle("sync-session", async (event, { token, refreshToken }) => {
    log.info("Session tokens synced and saved");
    // Store tokens securely in SQLite
    db.setTokens(token, refreshToken);

    // Inject tokens into storeView immediately if active
    if (storeView && !storeView.webContents.isDestroyed()) {
      try {
        await storeView.webContents.executeJavaScript(`
          localStorage.setItem('accessToken', ${JSON.stringify(token)});
          localStorage.setItem('refreshToken', ${JSON.stringify(refreshToken || '')});
          window.dispatchEvent(new Event('storage'));
        `);
        log.info("sync-session: Tokens injected into active storeView");
      } catch (err) {
        log.error("sync-session: Failed to inject tokens into active storeView:", err);
      }
    }

    // Alert the native UI about the login state
    mainWindow.webContents.send("session-updated", { loggedIn: true });
    return { success: true };
  });

  // Check if session is valid
  ipcMain.handle("check-auth", async () => {
    const { token } = db.getTokens();
    if (!token) {
      log.info("check-auth: No stored token found");
      return { success: false };
    }

    try {
      log.info("check-auth: Verifying token with backend...");
      const response = await fetch("https://play.lazplay.tech/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        const user = result.data || result;
        log.info("check-auth: Token verified successfully for user:", user.username || user.email);
        return { success: true, user };
      } else {
        log.warn(`check-auth: Token verification failed with status ${response.status}`);
        return { success: false };
      }
    } catch (error: any) {
      log.error("check-auth: Failed to reach auth endpoint:", error.message);
      // In case of network errors but we have a token, we might still return the active state or offline state.
      // For now, let's require successful authentication.
      return { success: false, error: "Network error" };
    }
  });

  // Clear Session (Logout)
  ipcMain.handle("clear-session", async () => {
    log.info("clear-session: Logging out user, clearing SQLite tokens...");
    db.setTokens("", "");

    if (storeView && mainWindow) {
      try {
        mainWindow.contentView.removeChildView(storeView);
        log.info("clear-session: Detached storeView from mainWindow");
      } catch (e) {
        log.warn("clear-session: Failed to detach storeView:", e);
      }
    }

    if (storeView && !storeView.webContents.isDestroyed()) {
      try {
        await storeView.webContents.executeJavaScript(`
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.dispatchEvent(new Event('storage'));
        `);
        log.info("clear-session: Successfully cleared tokens from storeView localStorage");
      } catch (e) {
        log.warn("clear-session: Failed to clear tokens from storeView:", e);
      }
    }
    mainWindow.webContents.send("session-updated", { loggedIn: false });
    return { success: true };
  });

  // Retrieve security authorization token
  ipcMain.handle("get-access-token", async () => {
    const { token } = db.getTokens();
    return token || null;
  });

  // Game Operations
  ipcMain.handle("install-game", async (event, gameId: string, options: any) => {
    log.info(`Install requested for game: ${gameId}`, options);
    try {
      const { token } = db.getTokens();
      if (options?.usesChunkDistribution && token) {
        options.token = token;
      }
      await downloadManager.startInstall(gameId, options);
      return { success: true };
    } catch (error: any) {
      log.error(`Install failed for ${gameId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("repair-game", async (event, gameId: string) => {
    const { token } = db.getTokens();
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      await downloadManager.repairGame(gameId, token);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("launch-game", async (event, gameId: string) => {
    log.info(`Launch requested for game: ${gameId}`);
    try {
      await processManager.launchGame(gameId);
      return { success: true };
    } catch (error: any) {
      log.error(`Launch failed for ${gameId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("uninstall-game", async (event, gameId: string) => {
    log.info(`Uninstall requested for game: ${gameId}`);
    try {
      await processManager.stopGame(gameId); // Force stop if running
      await downloadManager.uninstall(gameId);
      return { success: true };
    } catch (error: any) {
      log.error(`Uninstall failed for ${gameId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("pause-download", async (event, gameId: string) => {
    return downloadManager.pauseDownload(gameId);
  });

  ipcMain.handle("resume-download", async (event, gameId: string) => {
    return downloadManager.resumeDownload(gameId);
  });

  ipcMain.handle("set-game-entrypoint", async (event, gameId: string, entrypoint: string) => {
    log.info(`Setting entrypoint for game ${gameId}: ${entrypoint}`);
    db.setGameStatus(gameId, "installed", { entrypoint });
    return { success: true };
  });

  ipcMain.handle("open-install-folder", async (event, gameId: string) => {
    const game = db.getGame(gameId);
    if (game && game.installPath) {
      const targetPath = game.entrypoint
        ? path.join(game.installPath, game.entrypoint)
        : game.installPath;

      if (fs.existsSync(targetPath)) {
        shell.showItemInFolder(targetPath);
      } else {
        shell.openPath(game.installPath);
      }
      return true;
    }
    return false;
  });

  // State queries
  ipcMain.handle("get-installed-games", () => {
    return db.getInstalledGames();
  });

  ipcMain.handle("get-running-games", () => {
    return processManager.getRunningGames();
  });

  ipcMain.handle("get-download-progress", (event, gameId: string) => {
    return downloadManager.getProgress(gameId);
  });

  ipcMain.handle("get-disk-usage", async () => {
    // Basic implementation, you'd use a robust disk space library here
    return {
      free: 100000000000,
      total: 500000000000,
    };
  });

  ipcMain.handle("set-store-visibility", (event, visible: boolean) => {
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
      } else {
        mainWindow.contentView.removeChildView(storeView);
      }
    }
  });

  ipcMain.handle("navigate-store-path", async (event, path: string) => {
    if (storeView && !storeView.webContents.isDestroyed()) {
      try {
        const fullUrl = `https://play.lazplay.tech${path}`;
        log.info(`navigate-store-path: Navigating storeView to ${fullUrl}`);
        await storeView.webContents.loadURL(fullUrl);
        return { success: true };
      } catch (err: any) {
        log.error(`navigate-store-path failed for ${path}:`, err.message);
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: "Storefront view not available" };
  });


  ipcMain.handle("sync-remote-library", async () => {
    // Strategy 1: Read token directly from the store WebContentsView's localStorage.
    // This is the most reliable approach — the user is already logged in on the store tab,
    // so the token is right there without needing a prior sync-session call.
    let token: string | null = null;

    if (storeView && !storeView.webContents.isDestroyed()) {
      try {
        token = await storeView.webContents.executeJavaScript(
          `localStorage.getItem('accessToken')`
        );
        if (token) log.info("Token read from storeView localStorage ✓");
      } catch (e) {
        log.warn("Could not read token from storeView:", e);
      }
    }

    // Strategy 2: Fall back to SQLite-stored token (from sync-session)
    if (!token) {
      const stored = db.getTokens();
      token = stored.token || null;
      if (token) log.info("Token read from SQLite ✓");
    }

    if (!token) {
      log.warn("sync-remote-library: No token found. User must log in via the Store tab.");
      return { success: false, error: "Not logged in — please log in on the Store tab first." };
    }

    try {
      const libRes = await fetch("https://play.lazplay.tech/api/v1/library", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!libRes.ok) {
        const text = await libRes.text();
        log.error(`Library fetch failed (${libRes.status}):`, text);
        throw new Error(`Library fetch failed: ${libRes.status}`);
      }

      const libData = await libRes.json();
      log.info("Library raw response:", JSON.stringify(libData).slice(0, 500));

      // Normalise to array — handle {data:[]}, {items:[]}, or bare array
      const ownedItems: any[] = libData.data || libData.items || (Array.isArray(libData) ? libData : []);
      log.info(`Library items count: ${ownedItems.length}`);

      const ownedGames = ownedItems
        .map((entry: any) => {
          const game = entry.game || entry;
          const id = String(game.id || game.gameId || entry.gameId);
          const platforms: string[] = (game.platforms || entry.platforms || []).map((p: string) => p.toUpperCase());
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
        .filter((g: any) => {
          if (g.platforms.length === 0) return true; // unknown/unspecified — include by default
          
          // Exclude mobile-only / Android-only games on desktop launcher
          const MOBILE_ONLY = new Set(["ANDROID", "IOS", "MOBILE"]);
          if (g.platforms.every((p: string) => MOBILE_ONLY.has(p))) {
            return false;
          }

          // Exclude browser-only games
          const WEB_PLATFORMS = new Set(["WEB", "BROWSER", "HTML5"]);
          if (g.platforms.every((p: string) => WEB_PLATFORMS.has(p))) {
            return false;
          }

          // Ensure OS platform compatibility
          if (process.platform === "win32") {
            return g.platforms.some((p: string) => p === "WINDOWS" || p === "PC" || p === "DESKTOP" || p === "WIN" || p === "WIN32");
          }
          
          if (process.platform === "linux") {
            // Linux launcher supports native Linux games OR Windows games via Proton compatibility
            return g.platforms.some((p: string) => p === "LINUX" || p === "WINDOWS" || p === "PC" || p === "DESKTOP" || p === "WIN" || p === "WIN32");
          }

          if (process.platform === "darwin") {
            return g.platforms.some((p: string) => p === "MAC" || p === "OSX" || p === "MACOS" || p === "PC" || p === "DESKTOP");
          }

          return true;
        });

      // Synchronize SQLite cover/banner images for any locally registered games
      ownedGames.forEach((g: any) => {
        const local = db.getGame(g.id);
        if (local) {
          db.setGameStatus(g.id, local.status, {
            coverUrl: g.coverUrl || local.coverUrl,
            bannerUrl: g.bannerUrl || local.bannerUrl
          });
        }
      });

      // Also persist the token for future use (so later calls work even if store view is hidden)
      if (token) db.setTokens(token, db.getTokens().refreshToken || "");

      return {
        success: true,
        ownedIds: ownedGames.map((g: any) => g.id),
        allGames: ownedGames,
      };
    } catch (error: any) {
      log.error("Sync library failed:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("claim-game", async (event, gameId: string) => {
    const { token } = db.getTokens();
    if (!token) return { success: false, error: "Not logged in" };

    try {
      const response = await fetch("https://play.lazplay.tech/api/v1/library", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gameId }),
      });

      if (!response.ok) throw new Error("Claim failed");
      return { success: true };
    } catch (error: any) {
      log.error("Claim failed:", error);
      return { success: false, error: error.message };
    }
  });

  // Select Folder dialog for Creator Workspace (chunked uploads)
  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory", "createDirectory"],
      title: "Select Build Directory"
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // Client-side high performance chunked uploader pipeline
  ipcMain.handle("upload-build-directory", async (event, { gameId, buildId, folderPath, platform, version }) => {
    const { token } = db.getTokens();
    if (!token) throw new Error("Authentication token not found. Please log in first.");

    try {
      log.info(`Staging chunked build pipeline for game ${gameId}, build ${buildId} on folder: ${folderPath}`);
      
      // Dynamic import to prevent CommonJS ERR_REQUIRE_ESM at runtime
      const { runUploadPipeline } = await (eval('import("@lazplay/distribution")') as Promise<any>);

      const requestApi = async (method: string, endpoint: string, body?: any) => {
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

      const uploadChunkToUrl = async (uploadUrl: string, chunkBuffer: Buffer) => {
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: chunkBuffer as any
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
        onProgress: (progress: number, status: string) => {
          mainWindow.webContents.send("upload-progress", { buildId, progress, status });
        }
      });

      log.info(`Chunked build deployment complete! Manifest: ${result.manifestObjectKey}`);
      return { success: true, manifestObjectKey: result.manifestObjectKey };
    } catch (err: any) {
      log.error(`Chunked build deployment failed:`, err);
      mainWindow.webContents.send("upload-progress", { buildId, progress: 0, status: `ERROR: ${err.message}` });
      return { success: false, error: err.message };
    }
  });

  // Compatibility and Proton layer handling
  ipcMain.handle("check-proton-status", () => {
    try {
      const isInstalled = compatibilityManager.checkProtonInstalled() || processManager.findProtonPath() !== null;
      return { success: true, isInstalled };
    } catch (error: any) {
      log.error("Failed to check proton status:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("download-proton", async () => {
    log.info("Proton download requested via IPC");
    try {
      const success = await compatibilityManager.downloadProton(mainWindow);
      return { success };
    } catch (error: any) {
      log.error("Proton download handler failed:", error);
      return { success: false, error: error.message };
    }
  });
}
