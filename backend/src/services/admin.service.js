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
  const game = await updateGameForOwner(gameId, { id: 0, role: "admin" }, { status });

  if (game && String(status).toLowerCase() === "published") {
    await query(
      `
        INSERT INTO notifications (user_id, type, title, detail, unread)
        VALUES ($1, 'Update', 'Game approved', $2, TRUE);
      `,
      [game.developerId, `${game.title || game.name} was approved and is now live on LazPlay.`]
    );
  }

  return game;
}
