import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "../config/db.js";
import { env } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSqlFile(fileName) {
  const filePath = path.resolve(__dirname, fileName);
  const sql = await fs.readFile(filePath, "utf8");
  if (!sql.trim()) {
    return;
  }
  await query(sql);
}

export async function initializeDatabase() {
  if (!env.DB_AUTO_INIT) {
    return;
  }

  await runSqlFile("schema.sql");

  if (env.DB_AUTO_SEED) {
    await runSqlFile("seed.sql");
  }
}
