import { query } from "../config/db.js";

function mapThread(row) {
  return {
    id: row.id,
    gameId: row.game_id,
    title: row.title,
    body: row.body,
    category: row.category,
    author: row.author || "LazPlay User",
    likes: Number(row.likes || 0),
    replies: Number(row.replies || 0),
    createdAt: row.created_at
  };
}

export async function listThreads(filters = {}) {
  const category = String(filters.category || "").trim();
  const gameId = Number(filters.gameId || 0);

  const result = await query(
    `
      SELECT t.*, u.name AS author
      FROM community_threads t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE
        ($1 = '' OR t.category = $1)
        AND ($2::int = 0 OR t.game_id = $2)
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT 100;
    `,
    [category, Number.isInteger(gameId) ? gameId : 0]
  );

  return result.rows.map(mapThread);
}

export async function createThread(userId, payload) {
  const title = String(payload.title || "").trim();
  const body = String(payload.body || "").trim();
  const category = String(payload.category || "Discussions").trim();
  const gameId = Number(payload.gameId || 0);

  if (!title) {
    const error = new Error("Thread title is required.");
    error.statusCode = 400;
    throw error;
  }

  const result = await query(
    `
      INSERT INTO community_threads (user_id, game_id, category, title, body)
      VALUES ($1, NULLIF($2, 0), $3, $4, $5)
      RETURNING *, NULL::TEXT AS author;
    `,
    [userId, Number.isInteger(gameId) ? gameId : 0, category, title, body]
  );

  return mapThread(result.rows[0]);
}

export async function likeThread(threadId) {
  const result = await query(
    `
      UPDATE community_threads
      SET likes = likes + 1
      WHERE id = $1
      RETURNING *, NULL::TEXT AS author;
    `,
    [threadId]
  );

  return result.rows[0] ? mapThread(result.rows[0]) : null;
}
