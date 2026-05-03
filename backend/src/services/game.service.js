import path from "node:path";
import { query } from "../config/db.js";
import { env } from "../config/env.js";

function publicUrlFromFilePath(filePath) {
  const fileName = path.basename(String(filePath || ""));
  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  return `${base}/games/${encodeURIComponent(fileName)}`;
}

function mapGameRow(row) {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    filePath: row.file_path,
    size: Number(row.size),
    createdAt: row.created_at,
    owned: Boolean(row.owned),
    publicUrl: publicUrlFromFilePath(row.file_path)
  };
}

export async function listGamesForUser(userId) {
  const sql = `
    SELECT
      g.id,
      g.name,
      g.version,
      g.file_path,
      g.size,
      g.created_at,
      (ug.user_id IS NOT NULL) AS owned
    FROM games g
    LEFT JOIN user_games ug
      ON ug.game_id = g.id
      AND ug.user_id = $1
    ORDER BY g.created_at DESC, g.id DESC;
  `;

  const result = await query(sql, [userId]);
  return result.rows.map(mapGameRow);
}

export async function getGameByIdForUser(gameId, userId) {
  const sql = `
    SELECT
      g.id,
      g.name,
      g.version,
      g.file_path,
      g.size,
      g.created_at,
      (ug.user_id IS NOT NULL) AS owned
    FROM games g
    LEFT JOIN user_games ug
      ON ug.game_id = g.id
      AND ug.user_id = $2
    WHERE g.id = $1
    LIMIT 1;
  `;

  const result = await query(sql, [gameId, userId]);
  return result.rows[0] ? mapGameRow(result.rows[0]) : null;
}

export async function userHasAccessToGame(userId, gameId) {
  const sql = `
    SELECT 1
    FROM user_games
    WHERE user_id = $1 AND game_id = $2
    LIMIT 1;
  `;

  const result = await query(sql, [userId, gameId]);
  return result.rowCount > 0;
}

export async function createGame({ name, version, filePath, size }) {
  const sql = `
    INSERT INTO games (name, version, file_path, size)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, version, file_path, size, created_at;
  `;

  const result = await query(sql, [name, version, filePath, size]);
  return mapGameRow({ ...result.rows[0], owned: false });
}

export async function grantUserAccessToGame(userId, gameId) {
  const sql = `
    INSERT INTO user_games (user_id, game_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, game_id) DO NOTHING;
  `;

  await query(sql, [userId, gameId]);
}
