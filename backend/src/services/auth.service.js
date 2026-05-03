import { query } from "../config/db.js";
import { env } from "../config/env.js";
import { normalizeRole, roles } from "../utils/roles.js";

function mapUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: normalizeRole(row.role),
    bio: row.bio || "",
    avatarUrl: row.avatar_url || ""
  };
}

export async function getUserById(userId) {
  const result = await query(
    "SELECT id, email, name, role, bio, avatar_url FROM users WHERE id = $1 LIMIT 1;",
    [userId]
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}

export async function findOrCreateUserFromOAuth(profile) {
  const requestedRole = normalizeRole(profile.role);
  const email = String(profile.email).toLowerCase();
  const role = env.ADMIN_EMAILS.includes(email) ? roles.ADMIN : requestedRole;

  const sql = `
    INSERT INTO users (email, name, oauth_provider, oauth_id, role)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (email)
    DO UPDATE SET
      name = EXCLUDED.name,
      oauth_provider = EXCLUDED.oauth_provider,
      oauth_id = EXCLUDED.oauth_id,
      role = CASE
        WHEN users.role = 'admin' THEN users.role
        WHEN EXCLUDED.role = 'admin' THEN users.role
        ELSE EXCLUDED.role
      END,
      updated_at = NOW()
    RETURNING id, email, name, role, bio, avatar_url;
  `;

  const values = [email, profile.name, profile.provider, profile.oauthId, role];
  const result = await query(sql, values);
  return mapUserRow(result.rows[0]);
}

export async function updateUserProfile(userId, updates) {
  const result = await query(
    `
      UPDATE users
      SET
        name = COALESCE(NULLIF($2, ''), name),
        bio = COALESCE($3, bio),
        avatar_url = COALESCE($4, avatar_url),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, name, role, bio, avatar_url;
    `,
    [userId, updates.name, updates.bio, updates.avatarUrl]
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}
