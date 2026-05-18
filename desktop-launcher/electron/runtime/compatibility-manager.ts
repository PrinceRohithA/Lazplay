import { BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import { exec } from "child_process";
import log from "electron-log";

export interface ProtonProgressData {
  progress: number;
  status: "downloading" | "extracting" | "installed" | "error";
  error?: string;
}

export class CompatibilityManager {
  private isDownloading = false;

  getRuntimesDir(): string {
    return path.join(os.homedir(), ".config/lazplay/runtimes");
  }

  checkProtonInstalled(): boolean {
    const runtimesDir = this.getRuntimesDir();
    if (!fs.existsSync(runtimesDir)) return false;

    try {
      const files = fs.readdirSync(runtimesDir);
      for (const file of files) {
        if (file.toLowerCase().includes("proton")) {
          const protonPath = path.join(runtimesDir, file, "proton");
          if (fs.existsSync(protonPath)) {
            return true;
          }
        }
      }
    } catch (e) {
      log.error("Failed to read runtimes directory:", e);
    }
    return false;
  }

  async downloadProton(mainWindow: BrowserWindow): Promise<boolean> {
    if (this.isDownloading) {
      log.warn("Proton download is already in progress.");
      return false;
    }

    this.isDownloading = true;
    const runtimesDir = this.getRuntimesDir();
    const tempTarPath = path.join(runtimesDir, "proton-temp.tar.gz");

    // Ensure the directories exist
    if (!fs.existsSync(runtimesDir)) {
      fs.mkdirSync(runtimesDir, { recursive: true });
    }

    // A high-speed, stable mirror for GE-Proton (latest compatible build)
    const downloadUrl = "https://github.com/GloriousEggroll/proton-ge-custom/releases/download/GE-Proton9-4/GE-Proton9-4.tar.gz";

    log.info(`[Proton-Downloader] Fetching Proton from: ${downloadUrl}`);
    this.sendProgress(mainWindow, { progress: 0, status: "downloading" });

    try {
      const response = await axios({
        url: downloadUrl,
        method: "GET",
        responseType: "stream",
      });

      const totalBytes = parseInt(String(response.headers["content-length"] || "0"), 10);
      let downloadedBytes = 0;
      const writer = fs.createWriteStream(tempTarPath);

      response.data.on("data", (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
        this.sendProgress(mainWindow, { progress, status: "downloading" });
      });

      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on("finish", () => resolve());
        writer.on("error", (err) => reject(err));
      });

      // 2. Extraction using native Linux 'tar' command to keep it fast, lightweight, and zero-dependency
      log.info("[Proton-Downloader] Download complete. Extracting tarball...");
      this.sendProgress(mainWindow, { progress: 100, status: "extracting" });

      // Run extraction in background thread
      await new Promise<void>((resolve, reject) => {
        exec(`tar -xzf "${tempTarPath}" -C "${runtimesDir}"`, (error, stdout, stderr) => {
          if (error) {
            log.error("[Proton-Downloader] Extraction error:", stderr || error.message);
            reject(new Error(stderr || error.message));
            return;
          }
          resolve();
        });
      });

      // 3. Clean up the temp archive
      if (fs.existsSync(tempTarPath)) {
        fs.unlinkSync(tempTarPath);
      }

      // 4. Verify directory name format (Ensure it's named under standard GE-Proton convention)
      const extractedFolder = path.join(runtimesDir, "GE-Proton9-4");
      const targetFolder = path.join(runtimesDir, "proton-ge");

      if (fs.existsSync(extractedFolder)) {
        if (fs.existsSync(targetFolder)) {
          fs.rmSync(targetFolder, { recursive: true, force: true });
        }
        fs.renameSync(extractedFolder, targetFolder);
        log.info("[Proton-Downloader] Renamed extracted folder to standard proton-ge path.");
      }

      log.info("[Proton-Downloader] Proton runtime successfully configured.");
      this.sendProgress(mainWindow, { progress: 100, status: "installed" });
      this.isDownloading = false;
      return true;

    } catch (err: any) {
      log.error("[Proton-Downloader] Download/Configuration failed:", err);
      this.sendProgress(mainWindow, {
        progress: 0,
        status: "error",
        error: err.message || "Failed to download or extract compatibility tool",
      });
      this.isDownloading = false;

      // Clean up on error
      if (fs.existsSync(tempTarPath)) {
        try { fs.unlinkSync(tempTarPath); } catch (_) {}
      }
      return false;
    }
  }

  private sendProgress(mainWindow: BrowserWindow, data: ProtonProgressData) {
    if (mainWindow && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send("proton-progress", data);
      mainWindow.webContents.send("store-proton-progress", data);
    }
  }
}

export const compatibilityManager = new CompatibilityManager();
