import { BrowserWindow, app } from "electron";
import fs from "fs";
import path from "path";
import { db } from "../storage/db";
import log from "electron-log";
import https from "https";

interface DownloadProgress {
  gameId: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  status: "downloading" | "paused" | "completed" | "error";
}

class DownloadManager {
  private activeDownloads: Map<string, { req: any; stream: fs.WriteStream }> =
    new Map();

  async startInstall(gameId: string) {
    const installPath = path.join(
      app.getPath("userData"),
      "installed-games",
      gameId,
    );

    if (!fs.existsSync(installPath)) {
      fs.mkdirSync(installPath, { recursive: true });
    }

    db.setGameStatus(gameId, "downloading", {
      title: `Game ${gameId}`, // In real app, fetch metadata from API
      installPath: installPath,
    });

    // Simulated CDN URL fetch
    // const cdnUrl = await fetch(`https://api.lazplay.tech/games/${gameId}/download-url`);
    const cdnUrl = "https://example.com/mock-game.zip"; // Mock url

    this.downloadFile(gameId, cdnUrl, path.join(installPath, "game.zip"));
  }

  private downloadFile(gameId: string, url: string, destination: string) {
    let downloadedBytes = 0;
    let totalBytes = 100000000; // Mock 100MB

    const stream = fs.createWriteStream(destination, { flags: "a" });

    // NOTE: For a real implementation, we would check if file exists, read its size,
    // and send a Range request: `Range: bytes=${existingSize}-`
    // const existingSize = fs.existsSync(destination) ? fs.statSync(destination).size : 0;

    log.info(`Starting download for ${gameId} to ${destination}`);

    // Mock download process instead of real HTTP for architecture demonstration
    // A production implementation would use `got` or `axios` with stream support
    // and range headers to resume downloads from Cloudflare R2.

    const interval = setInterval(() => {
      downloadedBytes += 5000000; // 5MB per tick
      const progress = (downloadedBytes / totalBytes) * 100;

      this.broadcastProgress({
        gameId,
        progress: Math.min(progress, 100),
        downloadedBytes,
        totalBytes,
        status: "downloading",
      });

      if (downloadedBytes >= totalBytes) {
        clearInterval(interval);
        this.finishDownload(gameId, destination);
      }
    }, 500);

    this.activeDownloads.set(gameId, { req: interval, stream });
  }

  private finishDownload(gameId: string, filePath: string) {
    this.activeDownloads.delete(gameId);
    log.info(`Download finished for ${gameId}`);

    this.broadcastProgress({
      gameId,
      progress: 100,
      downloadedBytes: 100000000,
      totalBytes: 100000000,
      status: "completed",
    });

    // In a real app, extract zip or verify chunks here.
    // mock extraction:
    const extractPath = path.dirname(filePath);
    fs.writeFileSync(
      path.join(extractPath, "executable.exe"),
      "mock exe content",
    );

    db.setGameStatus(gameId, "installed");
  }

  async pauseDownload(gameId: string) {
    const active = this.activeDownloads.get(gameId);
    if (active) {
      clearInterval(active.req);
      active.stream.close();
      this.activeDownloads.delete(gameId);
      db.setGameStatus(gameId, "paused");
      log.info(`Paused download for ${gameId}`);
      return true;
    }
    return false;
  }

  async resumeDownload(gameId: string) {
    const game = db.getGame(gameId);
    if (game && game.status === "paused") {
      db.setGameStatus(gameId, "downloading");
      // Resume logic here with Range headers
      log.info(`Resuming download for ${gameId}`);
      this.startInstall(gameId);
      return true;
    }
    return false;
  }

  async uninstall(gameId: string) {
    const game = db.getGame(gameId);
    if (game && game.installPath) {
      if (fs.existsSync(game.installPath)) {
        fs.rmSync(game.installPath, { recursive: true, force: true });
      }
      db.removeGame(gameId);
      log.info(`Uninstalled game ${gameId}`);
    }
  }

  getProgress(gameId: string): DownloadProgress | null {
    // Return from DB or active memory
    return null; // Mock
  }

  private broadcastProgress(data: DownloadProgress) {
    // Send to all browser windows
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send("download-progress", data);
      win.webContents.send("store-download-progress", data);
    });
  }
}

export const downloadManager = new DownloadManager();
