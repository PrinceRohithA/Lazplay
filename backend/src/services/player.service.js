import { pool, query } from "../config/db.js";
import { mapGameRow } from "./game.service.js";

const gameSelect = `
  SELECT
    g.*,
    creator.name AS developer_name,
    (ug.user_id IS NOT NULL) AS owned,
    (wi.user_id IS NOT NULL) AS wishlist,
    (ci.user_id IS NOT NULL) AS in_cart
  FROM games g
  LEFT JOIN users creator ON creator.id = g.developer_id
  LEFT JOIN user_games ug
    ON ug.game_id = g.id
    AND ug.user_id = $1
  LEFT JOIN wishlist_items wi
    ON wi.game_id = g.id
    AND wi.user_id = $1
  LEFT JOIN cart_items ci
    ON ci.game_id = g.id
    AND ci.user_id = $1
`;

export async function listLibrary(userId) {
  const result = await query(
    `
      ${gameSelect}
      WHERE ug.user_id IS NOT NULL
      ORDER BY ug.granted_at DESC;
    `,
    [userId]
  );

  return result.rows.map(mapGameRow);
}

export async function listCart(userId) {
  const result = await query(
    `
      ${gameSelect}
      WHERE ci.user_id IS NOT NULL AND g.status = 'published'
      ORDER BY ci.added_at DESC;
    `,
    [userId]
  );

  return result.rows.map(mapGameRow);
}

export async function addCartItem(userId, gameId) {
  const gameResult = await query(
    `
      SELECT id, price_cents
      FROM games
      WHERE id = $1 AND status = 'published'
      LIMIT 1;
    `,
    [gameId]
  );

  if (!gameResult.rows[0]) {
    return null;
  }

  await query(
    `
      INSERT INTO cart_items (user_id, game_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, game_id) DO NOTHING;
    `,
    [userId, gameId]
  );

  return listCart(userId);
}

export async function removeCartItem(userId, gameId) {
  await query("DELETE FROM cart_items WHERE user_id = $1 AND game_id = $2;", [userId, gameId]);
  return listCart(userId);
}

export async function listWishlist(userId) {
  const result = await query(
    `
      ${gameSelect}
      WHERE wi.user_id IS NOT NULL AND g.status = 'published'
      ORDER BY wi.added_at DESC;
    `,
    [userId]
  );

  return result.rows.map(mapGameRow);
}

export async function addWishlistItem(userId, gameId) {
  const gameResult = await query(
    "SELECT id FROM games WHERE id = $1 AND status = 'published' LIMIT 1;",
    [gameId]
  );

  if (!gameResult.rows[0]) {
    return null;
  }

  await query(
    `
      INSERT INTO wishlist_items (user_id, game_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, game_id) DO NOTHING;
    `,
    [userId, gameId]
  );

  return listWishlist(userId);
}

export async function removeWishlistItem(userId, gameId) {
  await query("DELETE FROM wishlist_items WHERE user_id = $1 AND game_id = $2;", [userId, gameId]);
  return listWishlist(userId);
}

export async function claimFreeGame(userId, gameId) {
  const result = await query(
    `
      INSERT INTO user_games (user_id, game_id, source, price_cents)
      SELECT $1, g.id, 'free_claim', 0
      FROM games g
      WHERE g.id = $2 AND g.status = 'published' AND g.price_cents = 0
      ON CONFLICT (user_id, game_id) DO NOTHING
      RETURNING game_id;
    `,
    [userId, gameId]
  );

  if (!result.rows[0]) {
    return null;
  }

  await query("DELETE FROM cart_items WHERE user_id = $1 AND game_id = $2;", [userId, gameId]);
  return listLibrary(userId);
}

export async function checkoutCart(userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cartResult = await client.query(
      `
        SELECT g.*
        FROM cart_items ci
        JOIN games g ON g.id = ci.game_id
        WHERE ci.user_id = $1 AND g.status = 'published'
        ORDER BY ci.added_at ASC;
      `,
      [userId]
    );

    if (!cartResult.rows.length) {
      await client.query("ROLLBACK");
      return null;
    }

    const totalCents = cartResult.rows.reduce((sum, row) => sum + Number(row.price_cents || 0), 0);
    const orderResult = await client.query(
      `
        INSERT INTO orders (user_id, total_cents, status)
        VALUES ($1, $2, 'paid')
        RETURNING id, user_id, total_cents, status, created_at;
      `,
      [userId, totalCents]
    );
    const order = orderResult.rows[0];

    for (const game of cartResult.rows) {
      await client.query(
        `
          INSERT INTO order_items (order_id, game_id, price_cents)
          VALUES ($1, $2, $3)
          ON CONFLICT (order_id, game_id) DO NOTHING;
        `,
        [order.id, game.id, game.price_cents]
      );

      await client.query(
        `
          INSERT INTO user_games (user_id, game_id, source, price_cents)
          VALUES ($1, $2, 'purchase', $3)
          ON CONFLICT (user_id, game_id)
          DO UPDATE SET source = EXCLUDED.source, price_cents = EXCLUDED.price_cents;
        `,
        [userId, game.id, game.price_cents]
      );
    }

    await client.query("DELETE FROM cart_items WHERE user_id = $1;", [userId]);
    await client.query(
      `
        INSERT INTO notifications (user_id, type, title, detail, unread)
        VALUES ($1, 'Purchase', 'Order confirmed', 'Your library has been updated.', TRUE);
      `,
      [userId]
    );

    await client.query("COMMIT");

    const library = await listLibrary(userId);
    return {
      order: {
        id: order.id,
        totalCents: Number(order.total_cents),
        total: Number(order.total_cents) / 100,
        status: order.status,
        createdAt: order.created_at
      },
      items: library
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listNotifications(userId) {
  const result = await query(
    `
      SELECT id, type, title, detail, unread, created_at
      FROM notifications
      WHERE user_id = $1 OR user_id IS NULL
      ORDER BY created_at DESC, id DESC
      LIMIT 50;
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    detail: row.detail,
    unread: Boolean(row.unread),
    createdAt: row.created_at
  }));
}

export async function dismissNotification(userId, notificationId) {
  await query(
    `
      UPDATE notifications
      SET unread = FALSE
      WHERE id = $1 AND user_id = $2;
    `,
    [notificationId, userId]
  );

  return listNotifications(userId);
}
