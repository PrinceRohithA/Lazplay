"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.storageDb = exports.initStorage = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let sqliteDb;
const initStorage = () => {
    const userDataPath = electron_1.app.getPath("userData");
    const dbDir = path_1.default.join(userDataPath, "storage");
    if (!fs_1.default.existsSync(dbDir)) {
        fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
    sqliteDb = new better_sqlite3_1.default(path_1.default.join(dbDir, "launcher.db"));
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
    const columns = sqliteDb.prepare("PRAGMA table_info(games)").all();
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
};
exports.initStorage = initStorage;
exports.storageDb = {
    setTokens: (token, refreshToken) => {
        const stmt = sqliteDb.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        stmt.run("token", token);
        stmt.run("refreshToken", refreshToken);
    },
    getTokens: () => {
        const stmt = sqliteDb.prepare("SELECT value FROM settings WHERE key = ?");
        const token = stmt.get("token");
        const refreshToken = stmt.get("refreshToken");
        return { token: token?.value, refreshToken: refreshToken?.value };
    },
    getGame: (id) => {
        const stmt = sqliteDb.prepare("SELECT * FROM games WHERE id = ?");
        return stmt.get(id);
    },
    getInstalledGames: () => {
        const stmt = sqliteDb.prepare("SELECT * FROM games WHERE status = ?");
        return stmt.all("installed");
    },
    setGameStatus: (id, status, additionalFields = {}) => {
        const existing = exports.storageDb.getGame(id);
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
            const stmt = sqliteDb.prepare(`UPDATE games SET ${updates.join(", ")} WHERE id = ?`);
            stmt.run(...values);
        }
        else {
            const stmt = sqliteDb.prepare(`
        INSERT INTO games (id, title, status, installPath, version, size, entrypoint, statusText, coverUrl, bannerUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(id, additionalFields.title || id, status, additionalFields.installPath || "", additionalFields.version || "1.0.0", additionalFields.size || 0, additionalFields.entrypoint || null, additionalFields.statusText || null, additionalFields.coverUrl || null, additionalFields.bannerUrl || null);
        }
    },
    removeGame: (id) => {
        const stmt = sqliteDb.prepare("DELETE FROM games WHERE id = ?");
        stmt.run(id);
    },
    updatePlaytime: (id, durationSeconds) => {
        const stmt = sqliteDb.prepare(`
      UPDATE games 
      SET playtime = playtime + ?, lastPlayed = ?
      WHERE id = ?
    `);
        stmt.run(durationSeconds, Date.now(), id);
    },
};
exports.db = exports.storageDb;
