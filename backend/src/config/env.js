import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

function toBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveProjectPath(value, fallbackRelativePath) {
  const raw = value || fallbackRelativePath;
  if (path.isAbsolute(raw)) {
    return raw;
  }
  return path.resolve(projectRoot, raw);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: toNumber(process.env.PORT, 2000),
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  API_BASE_URL: process.env.API_BASE_URL || "http://localhost:3000",
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || process.env.API_BASE_URL || "http://localhost:3000",
  JWT_SECRET: process.env.JWT_SECRET || "change-me-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "2h",
  DATABASE_URL: process.env.DATABASE_URL || "postgresql+psycopg://lazplay:Prince%4018@localhost:5432/lazplay",
  DB_AUTO_INIT: toBoolean(process.env.DB_AUTO_INIT, true),
  DB_AUTO_SEED: toBoolean(process.env.DB_AUTO_SEED, true),
  GAME_STORAGE_DIR: resolveProjectPath(process.env.GAME_STORAGE_DIR, "./storage/games"),
  MAX_UPLOAD_SIZE_MB: toNumber(process.env.MAX_UPLOAD_SIZE_MB, 2048),
  MOCK_OAUTH_ENABLED: toBoolean(process.env.MOCK_OAUTH_ENABLED, true),
  MOCK_OAUTH_PROVIDER: process.env.MOCK_OAUTH_PROVIDER || "mock",
  MOCK_OAUTH_EMAIL: process.env.MOCK_OAUTH_EMAIL || "player1@lazplay.local",
  MOCK_OAUTH_NAME: process.env.MOCK_OAUTH_NAME || "Player One"
};
