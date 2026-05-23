import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";
import fs from "fs";

let sqliteDb: Database.Database;

interface GameRecord {
  id: string;
  title: string;
  status: "installed" | "downloading" | "paused" | "corrupted";
  installPath: string;
  version: string;
  size: number;
  entrypoint?: string;
  statusText?: string;
  lastPlayed?: number;
  playtime?: number; // in seconds
  coverUrl?: string;
  bannerUrl?: string;
}

export const initStorage = () => {
  const userDataPath = app.getPath("userData");
  const dbDir = path.join(userDataPath, "storage");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  sqliteDb = new Database(path.join(dbDir, "launcher.db"));

  // Initialize Schema
  sqliteDb.pragma("journal_mode = WAL");

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      installPath TEXT NOT NULL,
      version TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      entrypoint TEXT,
      statusText TEXT,
      lastPlayed INTEGER,
      playtime INTEGER DEFAULT 0,
      coverUrl TEXT,
      bannerUrl TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS download_state (
      gameId TEXT PRIMARY KEY,
      progress REAL DEFAULT 0,
      downloadedBytes INTEGER DEFAULT 0,
      totalBytes INTEGER DEFAULT 0,
      manifestData TEXT
    );
  `);

  // Migration: Ensure new columns exist for existing databases
  const columns = sqliteDb.prepare("PRAGMA table_info(games)").all() as any[];
  const columnNames = columns.map((c) => c.name);

  if (!columnNames.includes("entrypoint")) {
    sqliteDb.exec("ALTER TABLE games ADD COLUMN entrypoint TEXT");
  }
  if (!columnNames.includes("statusText")) {
    sqliteDb.exec("ALTER TABLE games ADD COLUMN statusText TEXT");
  }
  if (!columnNames.includes("lastPlayed")) {
    sqliteDb.exec("ALTER TABLE games ADD COLUMN lastPlayed INTEGER");
  }
  if (!columnNames.includes("playtime")) {
    sqliteDb.exec("ALTER TABLE games ADD COLUMN playtime INTEGER DEFAULT 0");
  }
  if (!columnNames.includes("coverUrl")) {
    sqliteDb.exec("ALTER TABLE games ADD COLUMN coverUrl TEXT");
  }
  if (!columnNames.includes("bannerUrl")) {
    sqliteDb.exec("ALTER TABLE games ADD COLUMN bannerUrl TEXT");
  }

  // Reset any game status stuck in 'downloading' to 'paused'
  try {
    sqliteDb.prepare("UPDATE games SET status = 'paused' WHERE status = 'downloading'").run();
  } catch (e) {
    // console.error
  }
};

export const storageDb = {
  setTokens: (token: string, refreshToken: string) => {
    const stmt = sqliteDb.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    );
    stmt.run("token", token);
    stmt.run("refreshToken", refreshToken);
  },

  getTokens: () => {
    const stmt = sqliteDb.prepare("SELECT value FROM settings WHERE key = ?");
    const token = stmt.get("token") as any;
    const refreshToken = stmt.get("refreshToken") as any;
    return { token: token?.value, refreshToken: refreshToken?.value };
  },

  getGame: (id: string): GameRecord | null => {
    const stmt = sqliteDb.prepare("SELECT * FROM games WHERE id = ?");
    const game = stmt.get(id) as GameRecord | null;
    if (game) {
      try {
        const stateStmt = sqliteDb.prepare(
          "SELECT progress, downloadedBytes, totalBytes FROM download_state WHERE gameId = ?"
        );
        const state = stateStmt.get(game.id) as any;
        if (state) {
          return {
            ...game,
            progress: state.progress || 0,
            downloadedBytes: state.downloadedBytes || 0,
            totalBytes: state.totalBytes || 0,
          };
        }
      } catch (_) {}
    }
    return game;
  },

  getInstalledGames: (): GameRecord[] => {
    const stmt = sqliteDb.prepare("SELECT * FROM games");
    const games = stmt.all() as GameRecord[];
    return games.map((game) => {
      try {
        const stateStmt = sqliteDb.prepare(
          "SELECT progress, downloadedBytes, totalBytes FROM download_state WHERE gameId = ?"
        );
        const state = stateStmt.get(game.id) as any;
        if (state) {
          return {
            ...game,
            progress: state.progress || 0,
            downloadedBytes: state.downloadedBytes || 0,
            totalBytes: state.totalBytes || 0,
          };
        }
      } catch (_) {}
      return game;
    });
  },

  setGameStatus: (
    id: string,
    status: string,
    additionalFields: Partial<GameRecord> = {},
  ) => {
    const existing = storageDb.getGame(id);
    if (existing) {
      const updates = [];
      const values = [];
      for (const [k, v] of Object.entries(additionalFields)) {
        updates.push(`${k} = ?`);
        values.push(v);
      }
      updates.push("status = ?");
      values.push(status);
      values.push(id);

      const stmt = sqliteDb.prepare(
        `UPDATE games SET ${updates.join(", ")} WHERE id = ?`,
      );
      stmt.run(...values);
    } else {
      const stmt = sqliteDb.prepare(`
        INSERT INTO games (id, title, status, installPath, version, size, entrypoint, statusText, coverUrl, bannerUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        additionalFields.title || id,
        status,
        additionalFields.installPath || "",
        additionalFields.version || "1.0.0",
        additionalFields.size || 0,
        additionalFields.entrypoint || null,
        additionalFields.statusText || null,
        additionalFields.coverUrl || null,
        additionalFields.bannerUrl || null,
      );
    }
  },

  removeGame: (id: string) => {
    const stmt = sqliteDb.prepare("DELETE FROM games WHERE id = ?");
    stmt.run(id);
  },

  updatePlaytime: (id: string, durationSeconds: number) => {
    const stmt = sqliteDb.prepare(`
      UPDATE games 
      SET playtime = playtime + ?, lastPlayed = ?
      WHERE id = ?
    `);
    stmt.run(durationSeconds, Date.now(), id);
  },

  saveDownloadOptions: (gameId: string, options: any) => {
    // INSERT OR IGNORE so we don't clobber existing progress columns
    sqliteDb.prepare(
      "INSERT OR IGNORE INTO download_state (gameId, manifestData) VALUES (?, ?)"
    ).run(gameId, JSON.stringify(options));
    // Then update just the manifest data, leaving progress/bytes intact
    sqliteDb.prepare(
      "UPDATE download_state SET manifestData = ? WHERE gameId = ?"
    ).run(JSON.stringify(options), gameId);
  },

  saveDownloadProgress: (gameId: string, progress: number, downloadedBytes: number, totalBytes: number) => {
    try {
      const stmt = sqliteDb.prepare(
        "UPDATE download_state SET progress = ?, downloadedBytes = ?, totalBytes = ? WHERE gameId = ?"
      );
      stmt.run(progress, downloadedBytes, totalBytes, gameId);
    } catch (_) {}
  },

  getDownloadOptions: (gameId: string) => {
    const stmt = sqliteDb.prepare(
      "SELECT manifestData FROM download_state WHERE gameId = ?"
    );
    const row = stmt.get(gameId) as any;
    if (row && row.manifestData) {
      try {
        return JSON.parse(row.manifestData);
      } catch (_) {
        return null;
      }
    }
    return null;
  },

  removeDownloadState: (gameId: string) => {
    const stmt = sqliteDb.prepare("DELETE FROM download_state WHERE gameId = ?");
    stmt.run(gameId);
  },
};

export { storageDb as db };
