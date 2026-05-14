import { ipcMain, BrowserWindow, WebContentsView, shell } from "electron";
import { downloadManager } from "../downloads/manager";
import { processManager } from "../runtime/process-manager";
import { db } from "../storage/db";
import log from "electron-log";
import path from "path";

export function setupIpcHandlers(
  mainWindow: BrowserWindow,
  storeView: WebContentsView | null,
) {
  // Sync Session from website
  ipcMain.handle("sync-session", async (event, { token, refreshToken }) => {
    log.info("Session tokens synced from website");
    // Store tokens securely (e.g. in sqlite or keytar)
    db.setTokens(token, refreshToken);
    // Alert the native UI about the login state
    mainWindow.webContents.send("session-updated", { loggedIn: true });
    return { success: true };
  });

  // Game Operations
  ipcMain.handle("install-game", async (event, gameId: string, options: any) => {
    log.info(`Install requested for game: ${gameId}`, options);
    try {
      await downloadManager.startInstall(gameId, options);
      return { success: true };
    } catch (error: any) {
      log.error(`Install failed for ${gameId}:`, error);
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
      shell.showItemInFolder(path.join(game.installPath, "executable.exe")); // Or main directory
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
      } else {
        mainWindow.contentView.removeChildView(storeView);
      }
    }
  });

  ipcMain.handle("sync-remote-library", async () => {
    const { token } = db.getTokens();
    if (!token) return { success: false, error: "Not logged in" };

    try {
      // Fetch both user library AND all available games
      const [libRes, gamesRes] = await Promise.all([
        fetch("https://play.lazplay.tech/api/v1/library", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("https://play.lazplay.tech/api/v1/games", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!libRes.ok || !gamesRes.ok) throw new Error("Failed to fetch data");

      const libData = await libRes.json();
      const gamesData = await gamesRes.json();

      // Extract arrays safely
      const ownedItems = libData.data || libData.items || (Array.isArray(libData) ? libData : []);
      const allGamesItems = gamesData.data || gamesData.items || (Array.isArray(gamesData) ? gamesData : []);

      // Return combined data
      return {
        success: true,
        ownedIds: ownedItems.map((i: any) => String(typeof i === 'string' ? i : (i.gameId || i.id))),
        allGames: allGamesItems,
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
}
