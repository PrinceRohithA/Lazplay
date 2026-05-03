import { query } from "../config/db.js";
import { listGamesForViewer, updateGameForOwner } from "./game.service.js";

export async function listUsersForAdmin() {
  const result = await query(
    `
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.created_at,
        COUNT(DISTINCT ug.game_id) AS owned_count,
        COUNT(DISTINCT g.id) AS published_count
      FROM users u
      LEFT JOIN user_games ug ON ug.user_id = u.id
      LEFT JOIN games g ON g.developer_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC, u.id DESC;
    `
  );

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
    ownedCount: Number(row.owned_count || 0),
    publishedCount: Number(row.published_count || 0)
  }));
}

export async function listGamesForAdmin() {
  return listGamesForViewer({ role: "admin" });
}

export async function updateGameStatusForAdmin(gameId, status) {
  return updateGameForOwner(gameId, { id: 0, role: "admin" }, { status });
}
