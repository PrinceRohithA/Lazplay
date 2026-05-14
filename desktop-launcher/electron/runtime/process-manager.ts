import { spawn, ChildProcess } from "child_process";
import { BrowserWindow, app, shell } from "electron";
import path from "path";
import fs from "fs";
import { db } from "../storage/db";
import log from "electron-log";
import { downloadManager } from "../downloads/manager";

class ProcessManager {
  private runningGames: Map<
    string,
    { process: ChildProcess; startTime: number; runtimePath: string; originalPath: string }
  > = new Map();

  async launchGame(gameId: string) {
    if (this.runningGames.has(gameId)) {
      throw new Error("Game is already running");
    }

    const game = db.getGame(gameId);
    if (!game || game.status !== "installed") {
      throw new Error("Game is not installed");
    }

    let entrypoint = game.entrypoint;
    let exePath = entrypoint ? path.join(game.installPath, entrypoint) : "";

    // Fallback logic
    if (!entrypoint || !fs.existsSync(exePath)) {
      const fallbacks = ["game.exe", "index.html", "start.bat", "run.sh"];
      let foundFallback = false;

      for (const fallback of fallbacks) {
        const fallbackPath = path.join(game.installPath, fallback);
        if (fs.existsSync(fallbackPath)) {
          log.info(`Specified entrypoint not found. Falling back to ${fallback}`);
          exePath = fallbackPath;
          entrypoint = fallback; // SYNC: Update entrypoint string
          foundFallback = true;
          break;
        }
      }

      if (!foundFallback) {
        throw new Error(`Executable not found. Tried ${entrypoint || "nothing"} and common fallbacks.`);
      }
    }

    log.info(`Launching game ${gameId} from ${exePath}`);

    if (exePath.endsWith(".html") || exePath.endsWith(".htm")) {
      shell.openPath(exePath);
      this.runningGames.set(gameId, { 
        process: { kill: () => {} } as any, 
        startTime: Date.now(),
        runtimePath: "", 
        originalPath: game.installPath 
      });
      this.broadcastState(gameId, "running");
      // For now, we'll just keep it "running" until the user manually stops it or we implement a window tracker
      return;
    }

    const startTime = Date.now();
    const originalPath = game.installPath;
    const isMasked = entrypoint?.endsWith(".lazplay_locked") || false;
    const runtimePath = path.join(app.getPath("temp"), `LazRuntime_${gameId}_${Math.random().toString(36).substring(7)}`);

    try {
        if (!fs.existsSync(runtimePath)) {
            fs.mkdirSync(runtimePath, { recursive: true });
        }
        
        // MOVE TO RUNTIME PATH: Move everything to the secret temp folder
        const files = fs.readdirSync(originalPath);
        for (const file of files) {
            fs.renameSync(path.join(originalPath, file), path.join(runtimePath, file));
        }
        log.info(`Moved ${gameId} to secret runtime path: ${runtimePath}`);
    } catch (e) {
        log.error("Failed to move game to runtime path:", e);
        throw new Error("Security initialization failed");
    }

    const runtimeExePath = path.join(runtimePath, entrypoint || "");
    let launchPath = runtimeExePath;

    if (isMasked) {
        launchPath = runtimeExePath.replace(".lazplay_locked", "");
        try {
            if (fs.existsSync(runtimeExePath)) {
                downloadManager.scrambleFile(runtimeExePath); // HEAL: Restore the header
                fs.renameSync(runtimeExePath, launchPath);
                log.info(`Unmasked and Healed ${gameId} for launch`);
            }
        } catch (e) {
            log.error("Failed to unmask game for launch:", e);
        }
    }

    const exeDir = path.dirname(launchPath);
    const isExe = launchPath.toLowerCase().endsWith(".exe");
    log.info(`Launching game ${gameId} from ${launchPath} (CWD: ${exeDir}, shell: ${!isExe})`);

    const child = spawn(isExe ? launchPath : `"${launchPath}"`, [], {
      cwd: exeDir,
      detached: true,
      stdio: "ignore",
      shell: !isExe,
      env: {
        ...process.env,
        LAZPLAY_SECURE_MODE: "true",
        LAZPLAY_LAUNCH_TOKEN: Buffer.from(`${gameId}-${Date.now()}`).toString('base64'),
        LAZPLAY_INTERNAL_ID: gameId
      }
    });

    child.unref(); 

    this.runningGames.set(gameId, { process: child, startTime, runtimePath, originalPath });
    this.broadcastState(gameId, "running");

    child.on("error", (err) => {
      log.error(`Failed to start game ${gameId}:`, err);
      this.handleGameExit(gameId);
    });

    child.on("exit", (code, signal) => {
      log.info(`Game ${gameId} exited with code ${code} and signal ${signal}`);
      this.handleGameExit(gameId);
    });
  }

  async stopGame(gameId: string) {
    const running = this.runningGames.get(gameId);
    if (running) {
      log.info(`Force stopping game ${gameId}`);
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

  private handleGameExit(gameId: string) {
    const running = this.runningGames.get(gameId);
    if (running) {
      const durationSeconds = Math.floor(
        (Date.now() - running.startTime) / 1000,
      );
      db.updatePlaytime(gameId, durationSeconds);
      this.runningGames.delete(gameId);
      this.broadcastState(gameId, "stopped");

      // Sync to backend if logged in
      const { token } = db.getTokens();
      if (token && durationSeconds > 0) {
        fetch(`https://play.lazplay.tech/api/v1/library/${gameId}/session`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ durationSeconds })
        }).catch(err => log.error("Failed to sync playtime to backend:", err));
      }

      // RE-MASK and MOVE BACK
      const game = db.getGame(gameId);
      if (running.runtimePath && running.originalPath && fs.existsSync(running.runtimePath)) {
          try {
              // First, re-mask the entrypoint while still in temp
              if (game && game.entrypoint && game.entrypoint.endsWith(".lazplay_locked")) {
                  const unmaskedPath = path.join(running.runtimePath, game.entrypoint.replace(".lazplay_locked", ""));
                  const maskedPath = path.join(running.runtimePath, game.entrypoint);
                  if (fs.existsSync(unmaskedPath)) {
                      downloadManager.scrambleFile(unmaskedPath); // PROTECT: Corrupt header
                      fs.renameSync(unmaskedPath, maskedPath);
                      log.info(`Re-masked ${gameId} in runtime path`);
                  }
              }

              // Move everything back to the official folder
              const files = fs.readdirSync(running.runtimePath);
              for (const file of files) {
                  const dest = path.join(running.originalPath, file);
                  if (fs.existsSync(dest)) fs.unlinkSync(dest);
                  fs.renameSync(path.join(running.runtimePath, file), dest);
              }

              // Delete the secret temp folder
              fs.rmSync(running.runtimePath, { recursive: true, force: true });
              log.info(`Restored ${gameId} from runtime path and cleaned up`);
          } catch (e) {
              log.error("Failed to restore game from runtime path:", e);
          }
      }

      this.runningGames.delete(gameId);
      this.broadcastState(gameId, "stopped");
    }
  }

  private broadcastState(gameId: string, state: "running" | "stopped") {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send("game-state-change", { gameId, state });
      win.webContents.send("store-game-state", { gameId, state });
    });
  }
}

export const processManager = new ProcessManager();
