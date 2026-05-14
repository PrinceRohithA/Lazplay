import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";
import fs from "fs";

let db: Database.Database;

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
}

export const initStorage = () => {
  const userDataPath = app.getPath("userData");
  const dbDir = path.join(userDataPath, "storage");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(path.join(dbDir, "launcher.db"));

  // Initialize Schema
  db.pragma("journal_mode = WAL");

  db.exec(`
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
      playtime INTEGER DEFAULT 0
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
};

export const storageDb = {
  setTokens: (token: string, refreshToken: string) => {
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    );
    stmt.run("token", token);
    stmt.run("refreshToken", refreshToken);
  },

  getTokens: () => {
    const stmt = db.prepare("SELECT value FROM settings WHERE key = ?");
    const token = stmt.get("token") as any;
    const refreshToken = stmt.get("refreshToken") as any;
    return { token: token?.value, refreshToken: refreshToken?.value };
  },

  getGame: (id: string): GameRecord | null => {
    const stmt = db.prepare("SELECT * FROM games WHERE id = ?");
    return stmt.get(id) as GameRecord | null;
  },

  getInstalledGames: (): GameRecord[] => {
    const stmt = db.prepare("SELECT * FROM games WHERE status = ?");
    return stmt.all("installed") as GameRecord[];
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

      const stmt = db.prepare(
        `UPDATE games SET ${updates.join(", ")} WHERE id = ?`,
      );
      stmt.run(...values);
    } else {
      const stmt = db.prepare(`
        INSERT INTO games (id, title, status, installPath, version, size, entrypoint, statusText)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
      );
    }
  },

  removeGame: (id: string) => {
    const stmt = db.prepare("DELETE FROM games WHERE id = ?");
    stmt.run(id);
  },

  updatePlaytime: (id: string, durationSeconds: number) => {
    const stmt = db.prepare(`
      UPDATE games 
      SET playtime = playtime + ?, lastPlayed = ?
      WHERE id = ?
    `);
    stmt.run(durationSeconds, Date.now(), id);
  },
};

export { storageDb as db };
