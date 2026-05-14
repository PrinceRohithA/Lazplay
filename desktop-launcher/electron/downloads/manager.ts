import { BrowserWindow, app } from "electron";
import fs from "fs";
import path from "path";
import { db } from "../storage/db";
import log from "electron-log";
import axios from "axios";
import AdmZip from "adm-zip";

interface DownloadProgress {
  gameId: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  status: "downloading" | "paused" | "completed" | "error";
}

class DownloadManager {
  private activeDownloads: Map<string, { abort: AbortController; stream: fs.WriteStream }> =
    new Map();

  async startInstall(gameId: string, options: { title: string, downloadUrl: string, entrypoint: string }) {
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
      entrypoint: options.entrypoint
    });

    const cdnUrl = options.downloadUrl;
    if (!cdnUrl) {
        throw new Error("No download URL provided for game");
    }

    this.downloadFile(gameId, cdnUrl, path.join(installPath, "game.zip"), options);
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
                db.setGameStatus(gameId, "installed", { entrypoint });
            } else {
                log.warn(`Found ${exes.length} potential executables. Prompting user...`);
                db.setGameStatus(gameId, "paused", { statusText: "Requires Setup" }); // Temporary state
                
                // Notify UI to ask user
                const windows = BrowserWindow.getAllWindows();
                windows.forEach(win => {
                    win.webContents.send("request-entrypoint", {
                        gameId,
                        title: options.title,
                        potentialEntrypoints: exes.map(f => path.relative(extractPath, f))
                    });
                });
                return; // Stop here, wait for user input
            }
        } else {
            db.setGameStatus(gameId, "installed", { entrypoint });
        }

        this.broadcastProgress({
            gameId,
            progress: 100,
            downloadedBytes: 1,
            totalBytes: 1,
            status: "completed",
        });
    } catch (error) {
        log.error(`Extraction failed for ${gameId}:`, error);
        db.setGameStatus(gameId, "corrupted");
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
      // In a real app, you'd fetch the latest downloadUrl again
      // For now, we'll re-start the install if we have the URL stored or passed
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

