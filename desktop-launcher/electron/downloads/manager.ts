import { BrowserWindow, app } from "electron";
import fs from "fs";
import path from "path";
import { db } from "../storage/db";
import log from "electron-log";
import axios from "axios";
import AdmZip from "adm-zip";
import { chunkDownloader } from "./chunk-downloader";
import { ensureCacheDirs } from "./chunk-cache";

interface DownloadProgress {
  gameId: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  status: "downloading" | "paused" | "installed" | "error" | "corrupted";
}

class DownloadManager {
  private activeDownloads: Map<string, { abort: AbortController; stream: fs.WriteStream }> =
    new Map();

  async startInstall(
    gameId: string,
    options: {
      title: string;
      downloadUrl?: string;
      entrypoint: string;
      coverUrl?: string | null;
      bannerUrl?: string | null;
      usesChunkDistribution?: boolean;
      token?: string;
    },
  ) {
    const installPath = path.join(
      app.getPath("userData"),
      "installed-games",
      gameId,
    );

    if (!fs.existsSync(installPath)) {
      fs.mkdirSync(installPath, { recursive: true });
    }

    db.setGameStatus(gameId, "downloading", {
      title: options.title || `Game ${gameId}`,
      installPath: installPath,
      entrypoint: options.entrypoint,
      coverUrl: options.coverUrl || undefined,
      bannerUrl: options.bannerUrl || undefined,
    });

    if (options.usesChunkDistribution && options.token) {
      ensureCacheDirs();
      try {
        const result = await chunkDownloader.installFromChunks(
          {
            gameId,
            title: options.title,
            token: options.token,
            entrypoint: options.entrypoint,
            coverUrl: options.coverUrl,
            bannerUrl: options.bannerUrl,
            onProgress: (progress, downloaded, total) => {
              this.broadcastProgress({
                gameId,
                progress,
                downloadedBytes: downloaded,
                totalBytes: total,
                status: "downloading",
              });
            },
          },
          installPath,
        );
        await this.finalizeInstall(gameId, installPath, {
          ...options,
          entrypoint: result.entrypoint || options.entrypoint,
        });
      } catch (error) {
        log.error(`Chunk install failed for ${gameId}:`, error);
        db.setGameStatus(gameId, "corrupted");
        this.broadcastProgress({
          gameId,
          progress: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          status: "error",
        });
        throw error;
      }
      return;
    }

    const cdnUrl = options.downloadUrl;
    if (!cdnUrl) {
      throw new Error("No download URL provided for game");
    }

    this.downloadFile(gameId, cdnUrl, path.join(installPath, "game.zip"), options);
  }

  private async finalizeInstall(
    gameId: string,
    extractPath: string,
    options: { title: string; entrypoint: string },
  ) {
    let entrypoint = options.entrypoint;
    const fullExePath = entrypoint ? path.join(extractPath, entrypoint) : "";

    if (!entrypoint || !fs.existsSync(fullExePath)) {
      const files = this.getAllFiles(extractPath);
      const exes = files.filter(
        (f) =>
          f.endsWith(".exe") ||
          f.endsWith(".sh") ||
          f.endsWith(".bat") ||
          f.endsWith(".app"),
      );
      if (exes.length === 1) {
        entrypoint = path.relative(extractPath, exes[0]);
      }
    }

    if (entrypoint && fs.existsSync(path.join(extractPath, entrypoint))) {
      const originalPath = path.join(extractPath, entrypoint);
      const maskedEntrypoint = entrypoint + ".lazplay_locked";
      const maskedPath = originalPath + ".lazplay_locked";
      try {
        fs.renameSync(originalPath, maskedPath);
        this.scrambleFile(maskedPath);
        db.setGameStatus(gameId, "installed", { entrypoint: maskedEntrypoint });
      } catch {
        db.setGameStatus(gameId, "installed", { entrypoint });
      }
    } else {
      db.setGameStatus(gameId, "installed", { entrypoint });
    }

    this.broadcastProgress({
      gameId,
      progress: 100,
      downloadedBytes: 1,
      totalBytes: 1,
      status: "installed",
    });
  }

  private async downloadFile(gameId: string, url: string, destination: string, options: any) {
    log.info(`Starting download for ${gameId} to ${destination}`);

    const abortController = new AbortController();
    const writer = fs.createWriteStream(destination);

    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        signal: abortController.signal
      });

      const totalBytes = parseInt(String(response.headers['content-length'] || '0'), 10);
      let downloadedBytes = 0;

      response.data.on('data', (chunk: Buffer) => {
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

    } catch (error: any) {
      log.error(`Download failed for ${gameId}:`, error);
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

  private finishDownload(gameId: string, filePath: string, options: any) {
    this.activeDownloads.delete(gameId);
    log.info(`Download finished for ${gameId}. Starting extraction...`);

    try {
      const zip = new AdmZip(filePath);
      const extractPath = path.dirname(filePath);
      zip.extractAllTo(extractPath, true);

      // Remove the zip after extraction
      fs.unlinkSync(filePath);

      log.info(`Extraction complete for ${gameId}. Verifying entrypoint...`);

      // Try to find the entrypoint
      let entrypoint = options.entrypoint;
      const fullExePath = entrypoint ? path.join(extractPath, entrypoint) : "";

      if (!entrypoint || !fs.existsSync(fullExePath)) {
        log.warn(`Entrypoint ${entrypoint} not found in ${extractPath}. Scanning for executables...`);
        const files = this.getAllFiles(extractPath);
        const exes = files.filter(f => f.endsWith(".exe") || f.endsWith(".sh") || f.endsWith(".bat") || f.endsWith(".app"));

        if (exes.length === 1) {
          entrypoint = path.relative(extractPath, exes[0]);
          log.info(`Auto-detected entrypoint: ${entrypoint}`);
          
          // MASKING: Hide the executable
          const originalPath = path.join(extractPath, entrypoint);
          const maskedEntrypoint = entrypoint + ".lazplay_locked";
          const maskedPath = originalPath + ".lazplay_locked";
          
          try {
            fs.renameSync(originalPath, maskedPath);
            this.scrambleFile(maskedPath); // PROTECT: Corrupt the header
            db.setGameStatus(gameId, "installed", { entrypoint: maskedEntrypoint });
          } catch (e) {
            log.error("Failed to mask entrypoint:", e);
            db.setGameStatus(gameId, "installed", { entrypoint });
          }
        } else {
          log.warn(`Found ${exes.length} potential executables. Prompting user...`);
          db.setGameStatus(gameId, "paused", { statusText: "Requires Setup" });

          // Notify UI to ask user
          const windows = BrowserWindow.getAllWindows();
          windows.forEach(win => {
            win.webContents.send("request-entrypoint", {
              gameId,
              title: options.title,
              potentialEntrypoints: exes.map(f => path.relative(extractPath, f))
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
      } else {
        // MASKING: Hide the executable even if provided in options
        const originalPath = path.join(extractPath, entrypoint);
        const maskedEntrypoint = entrypoint + ".lazplay_locked";
        const maskedPath = originalPath + ".lazplay_locked";
        
        if (fs.existsSync(originalPath)) {
            try {
                fs.renameSync(originalPath, maskedPath);
                this.scrambleFile(maskedPath); // PROTECT: Corrupt the header
                db.setGameStatus(gameId, "installed", { entrypoint: maskedEntrypoint });
            } catch (e) {
                log.error("Failed to mask provided entrypoint:", e);
                db.setGameStatus(gameId, "installed", { entrypoint });
            }
        } else if (fs.existsSync(maskedPath)) {
            // Already masked
            db.setGameStatus(gameId, "installed", { entrypoint: maskedEntrypoint });
        } else {
            db.setGameStatus(gameId, "installed", { entrypoint });
        }
      }

      this.broadcastProgress({
        gameId,
        progress: 100,
        downloadedBytes: 1,
        totalBytes: 1,
        status: "installed",
      });
    } catch (error) {
      log.error(`Extraction failed for ${gameId}:`, error);
      db.setGameStatus(gameId, "corrupted");
      this.broadcastProgress({
        gameId,
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        status: "corrupted",
      });
    }
  }

  private getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
        arrayOfFiles = this.getAllFiles(path.join(dirPath, file), arrayOfFiles);
      } else {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    });

    return arrayOfFiles;
  }

  public scrambleFile(filePath: string) {
    try {
        const stats = fs.statSync(filePath);
        if (stats.size < 1024) return; // Too small to scramble safely

        const fd = fs.openSync(filePath, 'r+');
        const buffer = Buffer.alloc(1024);
        fs.readSync(fd, buffer, 0, 1024, 0);

        // Simple XOR scramble
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = buffer[i] ^ 0x42; // The LazPlay Secret Key
        }

        fs.writeSync(fd, buffer, 0, 1024, 0);
        fs.closeSync(fd);
        log.info(`Scrambled/Unscrambled header for ${path.basename(filePath)}`);
    } catch (e) {
        log.error("Scrambling failed:", e);
    }
  }

  async pauseDownload(gameId: string) {
    const active = this.activeDownloads.get(gameId);
    if (active) {
      active.abort.abort();
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
      log.info(`Resuming download for ${gameId}`);
      
      const { token } = db.getTokens();
      if (!token) {
        log.warn(`Cannot resume ${gameId}: Not authenticated`);
        db.setGameStatus(gameId, "paused");
        return false;
      }

      try {
        // Chunk-based distribution inherently supports resuming by verifying
        // existing chunks and downloading only the missing ones.
        await this.repairGame(gameId, token);
        return true;
      } catch (error) {
        log.error(`Failed to resume ${gameId}:`, error);
        db.setGameStatus(gameId, "paused");
        return false;
      }
    }
    return false;
  }

  async repairGame(gameId: string, token: string) {
    const game = db.getGame(gameId);
    if (!game?.installPath) throw new Error("Game not installed");
    db.setGameStatus(gameId, "downloading");
    await chunkDownloader.repair(gameId, token, game.installPath);
    db.setGameStatus(gameId, "installed");
    log.info(`Repair complete for ${gameId}`);
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
    return null; // Mock
  }

  private broadcastProgress(data: DownloadProgress) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send("download-progress", data);
      win.webContents.send("store-download-progress", data);
    });
  }
}

export const downloadManager = new DownloadManager();

