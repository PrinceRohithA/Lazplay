import path from "node:path";
import { query } from "../config/db.js";
import { env } from "../config/env.js";
import { roleAtLeast, roles } from "../utils/roles.js";

function slugify(value) {
  return (
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "game"
  );
}

function publicUrlFromFilePath(filePath) {
  const fileName = path.basename(String(filePath || ""));
  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  return `${base}/games/${encodeURIComponent(fileName)}`;
}

function normalizeTextArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return fallback;
}

export function mapGameRow(row) {
  const priceCents = Number(row.price_cents || 0);
  const filePath = row.file_path || "";

  return {
    id: row.id,
    name: row.name,
    title: row.name,
    slug: row.slug || slugify(row.name),
    developerId: row.developer_id,
    developer: row.developer_name || "Independent Creator",
    version: row.version,
    filePath,
    size: Number(row.size || 0),
    description: row.description || "",
    genre: row.genre || "Indie",
    price: priceCents / 100,
    priceCents,
    art: row.cover_art || "",
    coverArt: row.cover_art || "",
    status: row.status || "published",
    tags: normalizeTextArray(row.tags),
    platforms: normalizeTextArray(row.platforms, ["Windows"]),
    rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0),
    downloadCount: Number(row.download_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owned: Boolean(row.owned),
    wishlist: Boolean(row.wishlist),
    inCart: Boolean(row.in_cart),
    publicUrl: filePath ? publicUrlFromFilePath(filePath) : ""
  };
}

function viewerId(viewer) {
  return Number.isInteger(Number(viewer?.id)) ? Number(viewer.id) : null;
}

export function normalizeGameInput(input = {}) {
  const name = String(input.name || input.title || "Untitled Game").trim();
  const version = String(input.version || "1.0.0").trim();
  const priceCents =
    input.priceCents !== undefined
      ? Number(input.priceCents)
      : Math.round(Number(input.price || 0) * 100);

  return {
    name,
    title: name,
    version,
    slug: slugify(input.slug || `${name}-${version}`),
    description: String(input.description || "").trim(),
    genre: String(input.genre || "Indie").trim(),
    priceCents: Number.isFinite(priceCents) && priceCents > 0 ? priceCents : 0,
    coverArt: String(input.coverArt || input.art || "").trim(),
    status: String(input.status || "published").toLowerCase(),
    tags: normalizeTextArray(input.tags),
    platforms: normalizeTextArray(input.platforms, ["Windows"])
  };
}

export async function listGamesForViewer(viewer = null, filters = {}) {
  const userId = viewerId(viewer);
  const includeAll = roleAtLeast(viewer?.role, roles.ADMIN);
  const search = String(filters.search || "").trim().toLowerCase();

  const sql = `
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
    WHERE
      ($2::boolean = TRUE OR g.status = 'published')
      AND (
        $3 = ''
        OR LOWER(g.name || ' ' || COALESCE(g.description, '') || ' ' || COALESCE(g.genre, '')) LIKE '%' || $3 || '%'
        OR EXISTS (
          SELECT 1 FROM unnest(g.tags) tag WHERE LOWER(tag) LIKE '%' || $3 || '%'
        )
      )
    ORDER BY g.status = 'published' DESC, g.created_at DESC, g.id DESC;
  `;

  const result = await query(sql, [userId, includeAll, search]);
  return result.rows.map(mapGameRow);
}

export async function listGamesForUser(userId) {
  return listGamesForViewer({ id: userId, role: roles.PLAYER });
}

export async function listGamesForDeveloper(userId) {
  const sql = `
    SELECT
      g.*,
      creator.name AS developer_name,
      TRUE AS owned,
      FALSE AS wishlist,
      FALSE AS in_cart
    FROM games g
    LEFT JOIN users creator ON creator.id = g.developer_id
    WHERE g.developer_id = $1
    ORDER BY g.updated_at DESC, g.id DESC;
  `;

  const result = await query(sql, [userId]);
  return result.rows.map(mapGameRow);
}

export async function getGameByIdForViewer(gameId, viewer = null) {
  const userId = viewerId(viewer);
  const isAdmin = roleAtLeast(viewer?.role, roles.ADMIN);

  const sql = `
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
      AND ug.user_id = $2
    LEFT JOIN wishlist_items wi
      ON wi.game_id = g.id
      AND wi.user_id = $2
    LEFT JOIN cart_items ci
      ON ci.game_id = g.id
      AND ci.user_id = $2
    WHERE
      g.id = $1
      AND (
        g.status = 'published'
        OR g.developer_id = $2
        OR $3::boolean = TRUE
      )
    LIMIT 1;
  `;

  const result = await query(sql, [gameId, userId, isAdmin]);
  return result.rows[0] ? mapGameRow(result.rows[0]) : null;
}

export async function getGameByIdForUser(gameId, userId) {
  return getGameByIdForViewer(gameId, { id: userId, role: roles.PLAYER });
}

export async function createGame({
  developerId,
  name,
  version,
  filePath,
  size,
  description,
  genre,
  priceCents,
  coverArt,
  status,
  tags,
  platforms,
  slug
}) {
  const input = normalizeGameInput({
    name,
    version,
    description,
    genre,
    priceCents,
    coverArt,
    status,
    tags,
    platforms,
    slug
  });

  const sql = `
    INSERT INTO games (
      name,
      version,
      file_path,
      size,
      slug,
      developer_id,
      description,
      genre,
      price_cents,
      cover_art,
      status,
      tags,
      platforms
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *, NULL::TEXT AS developer_name, FALSE AS owned, FALSE AS wishlist, FALSE AS in_cart;
  `;

  const result = await query(sql, [
    input.name,
    input.version,
    filePath,
    size,
    input.slug,
    developerId,
    input.description,
    input.genre,
    input.priceCents,
    input.coverArt,
    input.status,
    input.tags,
    input.platforms
  ]);

  return mapGameRow(result.rows[0]);
}

export async function updateGameForOwner(gameId, viewer, updates) {
  const input = normalizeGameInput(updates);
  const isAdmin = roleAtLeast(viewer?.role, roles.ADMIN);
  const userId = viewerId(viewer);

  const sql = `
    UPDATE games
    SET
      name = COALESCE(NULLIF($3, ''), name),
      slug = COALESCE(NULLIF($4, ''), slug),
      description = COALESCE($5, description),
      genre = COALESCE(NULLIF($6, ''), genre),
      price_cents = COALESCE($7, price_cents),
      cover_art = COALESCE($8, cover_art),
      status = COALESCE(NULLIF($9, ''), status),
      tags = COALESCE($10, tags),
      platforms = COALESCE($11, platforms),
      updated_at = NOW()
    WHERE
      id = $1
      AND (developer_id = $2 OR $12::boolean = TRUE)
    RETURNING *, NULL::TEXT AS developer_name, FALSE AS owned, FALSE AS wishlist, FALSE AS in_cart;
  `;

  const result = await query(sql, [
    gameId,
    userId,
    updates.name ?? updates.title ?? null,
    updates.slug ? slugify(updates.slug) : null,
    updates.description ?? null,
    updates.genre ?? null,
    updates.priceCents === undefined && updates.price === undefined ? null : input.priceCents,
    updates.coverArt ?? updates.art ?? null,
    updates.status ?? null,
    updates.tags === undefined ? null : input.tags,
    updates.platforms === undefined ? null : input.platforms,
    isAdmin
  ]);

  return result.rows[0] ? mapGameRow(result.rows[0]) : null;
}

export async function archiveGameForOwner(gameId, viewer) {
  return updateGameForOwner(gameId, viewer, { status: "archived" });
}

export async function grantUserAccessToGame(userId, gameId, options = {}) {
  const sql = `
    INSERT INTO user_games (user_id, game_id, source, price_cents)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, game_id)
    DO UPDATE SET
      source = EXCLUDED.source,
      price_cents = EXCLUDED.price_cents;
  `;

  await query(sql, [
    userId,
    gameId,
    options.source || "purchase",
    Number(options.priceCents || 0)
  ]);
}

export async function markGameDownloaded(userId, gameId) {
  await query(
    `
      UPDATE user_games
      SET last_downloaded_at = NOW()
      WHERE user_id = $1 AND game_id = $2;
    `,
    [userId, gameId]
  );

  await query(
    `
      UPDATE games
      SET download_count = download_count + 1
      WHERE id = $1;
    `,
    [gameId]
  );
}
