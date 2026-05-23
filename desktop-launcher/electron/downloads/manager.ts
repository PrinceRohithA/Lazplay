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
  status: "downloading" | "paused" | "installed" | "error" | "corrupted" | "uninstalled";
}

class DownloadManager {
  private activeDownloads: Map<
    string,
    {
      abort: AbortController;
      stream?: fs.WriteStream;
      progress?: number;
      downloadedBytes?: number;
      totalBytes?: number;
    }
  > = new Map();

  // Tracks games currently being paused so the finish handler doesn't override status
  private pausingGames: Set<string> = new Set();

  startInstall(
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

    // Save download settings for pause/resume support
    db.saveDownloadOptions(gameId, options);

    if (options.usesChunkDistribution && options.token) {
      ensureCacheDirs();
      const abortController = new AbortController();
      this.activeDownloads.set(gameId, {
        abort: abortController,
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
      });

      // Fire chunk download in background — do NOT await here so IPC returns immediately
      chunkDownloader.installFromChunks(
        {
          gameId,
          title: options.title,
          token: options.token,
          entrypoint: options.entrypoint,
          coverUrl: options.coverUrl,
          bannerUrl: options.bannerUrl,
          signal: abortController.signal,
          onProgress: (progress, downloaded, total) => {
            const active = this.activeDownloads.get(gameId);
            if (active) {
              active.progress = progress;
              active.downloadedBytes = downloaded;
              active.totalBytes = total;
            }
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
      ).then(async (result) => {
        this.activeDownloads.delete(gameId);
        await this.finalizeInstall(gameId, installPath, {
          ...options,
          entrypoint: result.entrypoint || options.entrypoint,
        });
      }).catch((error: any) => {
        this.activeDownloads.delete(gameId);
        if (abortController.signal.aborted) {
          log.info(`Chunk install for ${gameId} successfully paused.`);
          return;
        }
        log.error(`Chunk install failed for ${gameId}:`, error);
        db.setGameStatus(gameId, "corrupted");
        this.broadcastProgress({
          gameId,
          progress: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          status: "error",
        });
      });

      // Return immediately — progress comes via broadcastProgress events
      return;
    }

    const cdnUrl = options.downloadUrl;
    if (!cdnUrl) {
      throw new Error("No download URL provided for game");
    }

    const urlPath = cdnUrl.split("?")[0].toLowerCase();
    const isZip = urlPath.endsWith(".zip") || urlPath.endsWith(".rar") || urlPath.endsWith(".7z") || urlPath.endsWith(".tar.gz");

    const destFileName = isZip ? "game.zip" : (options.entrypoint || "game.exe");
    const destination = path.join(installPath, destFileName);

    // Ensure the folder containing the destination path exists
    fs.mkdirSync(path.dirname(destination), { recursive: true });

    // Store the determined properties back in SQLite options
    db.saveDownloadOptions(gameId, { ...options, isZip, destFileName });

    // Fire in background — do NOT await so IPC returns immediately
    this.downloadFile(gameId, cdnUrl, destination, { ...options, isZip, destFileName });
  }


  private async finalizeInstall(
    gameId: string,
    extractPath: string,
    options: { title: string; entrypoint: string },
  ) {
    db.removeDownloadState(gameId);
    let entrypoint = options.entrypoint;
    const fullExePath = entrypoint ? path.join(extractPath, entrypoint) : "";

    if (!entrypoint || !fs.existsSync(fullExePath)) {
      const files = this.getAllFiles(extractPath);
      const exes = files.filter(
        (f) =>
          f.endsWith(".exe") ||
          f.endsWith(".sh") ||
          f.endsWith(".bat") ||
          f.endsWith(".app") ||
          f.endsWith(".apk") ||
          f.endsWith(".jar"),
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

  private async downloadFile(
    gameId: string,
    url: string,
    destination: string,
    options: any,
  ): Promise<boolean | void> {
    log.info(`Starting download for ${gameId} to ${destination}`);

    let existingSize = 0;
    let writeStreamFlags = 'w';
    if (options.isResume && fs.existsSync(destination)) {
      try {
        existingSize = fs.statSync(destination).size;
        writeStreamFlags = 'a';
        log.info(`Resuming download from byte: ${existingSize}`);
      } catch (e) {
        log.error("Failed to check existing file size for resume:", e);
      }
    } else {
      try {
        if (fs.existsSync(destination)) {
          fs.unlinkSync(destination);
        }
      } catch (_) {}
    }

    const abortController = new AbortController();
    const writer = fs.createWriteStream(destination, { flags: writeStreamFlags });

    try {
      const headers: Record<string, string> = {};
      if (existingSize > 0) {
        headers['Range'] = `bytes=${existingSize}-`;
      }

      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        signal: abortController.signal,
        headers
      });

      const totalContentLength = parseInt(String(response.headers['content-length'] || '0'), 10);
      const totalBytes = existingSize > 0 ? totalContentLength + existingSize : totalContentLength;
      let downloadedBytes = existingSize;

      const activeObj = {
        abort: abortController,
        stream: writer,
        progress: totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0,
        downloadedBytes,
        totalBytes,
      };
      this.activeDownloads.set(gameId, activeObj);

      response.data.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;

        activeObj.progress = progress;
        activeObj.downloadedBytes = downloadedBytes;
        activeObj.totalBytes = totalBytes;

        this.broadcastProgress({
          gameId,
          progress: Math.min(progress, 100),
          downloadedBytes,
          totalBytes,
          status: "downloading",
        });
      });

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          // If this game is being paused, do NOT finalize — the pause handler takes over
          if (this.pausingGames.has(gameId)) {
            log.info(`Download stream finished for ${gameId} but a pause is in progress — skipping finalize.`);
            resolve(true);
            return;
          }
          this.finishDownload(gameId, destination, options);
          resolve(true);
        });
        writer.on('error', reject);
      });

    } catch (error: any) {
      if (abortController.signal.aborted) {
        log.info(`Download for ${gameId} successfully aborted/paused.`);
        return;
      }

      const status = error?.response?.status;
      const alreadyRetried = Boolean(options?._retried);
      if (status === 403 && !alreadyRetried) {
        const { token } = db.getTokens();
        if (token) {
          const refreshedUrl = await this.fetchLatestDownloadUrl(gameId, token);
          if (refreshedUrl) {
            const nextOptions = { ...options, _retried: true, downloadUrl: refreshedUrl };
            const optionsForDb = { ...nextOptions };
            delete optionsForDb._retried;
            db.saveDownloadOptions(gameId, optionsForDb);
            log.warn(`Download for ${gameId} failed with 403. Retrying with refreshed URL.`);
            return this.downloadFile(gameId, refreshedUrl, destination, nextOptions);
          }
        }
      }

      log.error(`Download failed for ${gameId}:`, error);
      this.activeDownloads.delete(gameId);
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
    db.removeDownloadState(gameId);
    log.info(`Download finished for ${gameId}.`);

    const isZip = !!options.isZip;
    const extractPath = path.dirname(filePath);

    try {
      if (isZip) {
        log.info(`Starting extraction for ${gameId}...`);
        const zip = new AdmZip(filePath);
        zip.extractAllTo(extractPath, true);

        // Remove the zip after extraction
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          log.warn(`Failed to delete temporary zip file ${filePath}:`, e);
        }
        log.info(`Extraction complete for ${gameId}. Verifying entrypoint...`);
      } else {
        log.info(`Single file download complete for ${gameId}. No extraction needed.`);
      }

      // Try to find the entrypoint
      let entrypoint = options.entrypoint || options.destFileName || "game.exe";
      const fullExePath = entrypoint ? path.join(extractPath, entrypoint) : "";

      if (!entrypoint || !fs.existsSync(fullExePath)) {
        log.warn(`Entrypoint ${entrypoint} not found in ${extractPath}. Scanning for executables...`);
        const files = this.getAllFiles(extractPath);
        const exes = files.filter(f => {
          const name = f.toLowerCase();
          return (name.endsWith(".exe") || name.endsWith(".sh") || name.endsWith(".bat") || name.endsWith(".app") || name.endsWith(".apk") || name.endsWith(".jar")) && !name.endsWith("game.zip");
        });

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
      log.error(`Extraction/Verification failed for ${gameId}:`, error);
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
    try {
      if (!fs.existsSync(dirPath)) return arrayOfFiles;
      const files = fs.readdirSync(dirPath);

      files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            arrayOfFiles = this.getAllFiles(filePath, arrayOfFiles);
          } else {
            arrayOfFiles.push(filePath);
          }
        } catch (e) {
          log.warn(`Skipping stat for ${filePath} during verification:`, e);
        }
      });
    } catch (e) {
      log.error(`Failed to read directory ${dirPath}:`, e);
    }

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
      // Mark as pausing BEFORE calling abort so the stream finish handler skips finalize
      this.pausingGames.add(gameId);

      const lastProgress = active.progress || 0;
      const lastDownloaded = active.downloadedBytes || 0;
      const lastTotal = active.totalBytes || 0;

      // Abort the active request / stream
      active.abort.abort();
      if (active.stream) {
        try { active.stream.close(); } catch (_) {}
      }

      // Persist progress before clearing state
      db.saveDownloadProgress(gameId, lastProgress, lastDownloaded, lastTotal);

      this.activeDownloads.delete(gameId);
      db.setGameStatus(gameId, "paused");
      log.info(`Paused download for ${gameId} at ${lastProgress.toFixed(2)}%`);

      this.broadcastProgress({
        gameId,
        progress: lastProgress,
        downloadedBytes: lastDownloaded,
        totalBytes: lastTotal,
        status: "paused",
      });

      // Remove pause guard after a short delay so any in-flight finish events are handled
      setTimeout(() => this.pausingGames.delete(gameId), 2000);

      return true;
    }
    return false;
  }

  resumeDownload(gameId: string) {
    const game = db.getGame(gameId) as (ReturnType<typeof db.getGame> & {
      progress?: number;
      downloadedBytes?: number;
      totalBytes?: number;
    }) | null;
    if (game && game.status === "paused") {
      db.setGameStatus(gameId, "downloading");
      log.info(`Resuming download for ${gameId}`);
      
      const { token } = db.getTokens();
      if (!token) {
        log.warn(`Cannot resume ${gameId}: Not authenticated`);
        db.setGameStatus(gameId, "paused");
        return false;
      }

      const options = db.getDownloadOptions(gameId);
      if (!options) {
        log.error(`Cannot resume ${gameId}: No download options found`);
        db.setGameStatus(gameId, "paused");
        return false;
      }

      const initialProgress = game.progress || 0;
      const initialDownloaded = game.downloadedBytes || 0;
      const initialTotal = game.totalBytes || 0;

      // Immediately broadcast the stored progress so the UI picks up from the right place
      this.broadcastProgress({
        gameId,
        progress: initialProgress,
        downloadedBytes: initialDownloaded,
        totalBytes: initialTotal,
        status: "downloading",
      });

      // Fire resume work in background — do NOT block IPC
      let abortController: AbortController | null = null;

      const runResume = async () => {
        if (options.usesChunkDistribution) {
          abortController = new AbortController();
          this.activeDownloads.set(gameId, {
            abort: abortController,
            progress: initialProgress,
            downloadedBytes: initialDownloaded,
            totalBytes: initialTotal,
          });

          try {
            await chunkDownloader.repair(
              gameId,
              token,
              game.installPath,
              abortController.signal,
              (progress, downloaded, total) => {
                const active = this.activeDownloads.get(gameId);
                if (active) {
                  active.progress = progress;
                  active.downloadedBytes = downloaded;
                  active.totalBytes = total;
                }
                this.broadcastProgress({
                  gameId,
                  progress,
                  downloadedBytes: downloaded,
                  totalBytes: total,
                  status: "downloading",
                });
              }
            );

            // Only finalize if NOT paused mid-way
            if (!this.pausingGames.has(gameId)) {
              this.activeDownloads.delete(gameId);
              await this.finalizeInstall(gameId, game.installPath, options);
            }
          } catch (error: any) {
            const wasPaused = abortController?.signal.aborted || this.pausingGames.has(gameId);
            this.activeDownloads.delete(gameId);
            if (wasPaused) {
              log.info(`Resume of ${gameId} was interrupted by a pause — that's expected.`);
              return;
            }
            log.error(`Failed to resume chunk download ${gameId}:`, error);
            db.setGameStatus(gameId, "paused");
          }
        } else {
          const refreshedUrl = await this.fetchLatestDownloadUrl(gameId, token);
          if (refreshedUrl) {
            options.downloadUrl = refreshedUrl;
            const optionsForDb = { ...options, downloadUrl: refreshedUrl };
            db.saveDownloadOptions(gameId, optionsForDb);
          }

          const cdnUrl = options.downloadUrl;
          if (!cdnUrl) {
            log.error(`Cannot resume ${gameId}: no download URL`);
            db.setGameStatus(gameId, "paused");
            return;
          }
          const destination = path.join(game.installPath, options.destFileName || "game.zip");
          // downloadFile manages its own activeDownloads entry
          try {
            await this.downloadFile(gameId, cdnUrl, destination, { ...options, isResume: true });
          } catch (error: any) {
            log.error(`Failed to resume direct download ${gameId}:`, error);
          }
        }
      };

      runResume();
      return true;
    }
    return false;
  }

  async cancelDownload(gameId: string): Promise<boolean> {
    const game = db.getGame(gameId);
    if (!game) return false;

    if (game.status !== "paused" && game.status !== "downloading") {
      return false;
    }

    const active = this.activeDownloads.get(gameId);
    if (active) {
      this.pausingGames.add(gameId);
      active.abort.abort();
      if (active.stream) {
        try { active.stream.close(); } catch (_) {}
      }
      this.activeDownloads.delete(gameId);
      setTimeout(() => this.pausingGames.delete(gameId), 2000);
    }

    if (game.installPath && fs.existsSync(game.installPath)) {
      try {
        fs.rmSync(game.installPath, { recursive: true, force: true });
      } catch (e) {
        log.warn(`Failed to remove install folder for ${gameId}:`, e);
      }
    }

    db.removeDownloadState(gameId);
    db.setGameStatus(gameId, "uninstalled", {
      statusText: undefined,
    });

    this.broadcastProgress({
      gameId,
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      status: "uninstalled",
    });

    log.info(`Canceled download for ${gameId}`);
    return true;
  }

  private async fetchLatestDownloadUrl(gameId: string, token: string): Promise<string | null> {
    try {
      const platformParam = process.platform === "win32" ? "WINDOWS" : "LINUX";
      const response = await fetch(`https://play.lazplay.tech/api/v1/library?platform=${platformParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        log.warn(`Failed to refresh download URL (${response.status}): ${text}`);
        return null;
      }

      const data = await response.json();
      const items: any[] = data.data || data.items || (Array.isArray(data) ? data : []);
      const entry = items.find((item: any) => {
        const itemId = String(item.gameId || item.id || item.game?.id || "");
        return itemId === gameId;
      });

      if (!entry) return null;
      const game = entry.game || entry;
      return game.downloadUrl || game.buildUrl || entry.downloadUrl || entry.buildUrl || null;
    } catch (error: any) {
      log.warn(`Failed to refresh download URL for ${gameId}:`, error);
      return null;
    }
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
      db.removeDownloadState(gameId);
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

