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

    const startTime = Date.now();
    const child = spawn(exePath, [], {
      cwd: game.installPath,
      detached: true,
      stdio: "ignore",
    });

    child.unref(); // Allow the launcher to exit without terminating the game

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
