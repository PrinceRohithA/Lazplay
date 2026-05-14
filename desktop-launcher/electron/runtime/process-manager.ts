import { spawn, ChildProcess } from "child_process";
import { BrowserWindow } from "electron";
import path from "path";
import fs from "fs";
import { db } from "../storage/db";
import log from "electron-log";

class ProcessManager {
  private runningGames: Map<
    string,
    { process: ChildProcess; startTime: number }
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
      // For web games, we open them in the system browser (or we could open a new Electron window)
      // Note: Tracking playtime for web games launched this way is difficult
      import("electron").then(({ shell }) => {
        shell.openPath(exePath);
      });
      this.runningGames.set(gameId, { process: { kill: () => {} } as any, startTime: Date.now() });
      this.broadcastState(gameId, "running");
      // For now, we'll just keep it "running" until the user manually stops it or we implement a window tracker
      return;
    }

    const startTime = Date.now();
    const exeDir = path.dirname(exePath);
    const isExe = exePath.toLowerCase().endsWith(".exe");
    log.info(`Launching game ${gameId} from ${exePath} (CWD: ${exeDir}, shell: ${!isExe})`);

    const child = spawn(isExe ? exePath : `"${exePath}"`, [], {
      cwd: exeDir,
      detached: true,
      stdio: "ignore",
      shell: !isExe,
    });

    child.unref(); 

    this.runningGames.set(gameId, { process: child, startTime });
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
