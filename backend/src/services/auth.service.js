import { query } from "../config/db.js";

export async function findOrCreateUserFromOAuth(profile) {
  const sql = `
    INSERT INTO users (email, name, oauth_provider, oauth_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email)
    DO UPDATE SET
      name = EXCLUDED.name,
      oauth_provider = EXCLUDED.oauth_provider,
      oauth_id = EXCLUDED.oauth_id
    RETURNING id, email, name;
  `;

  const values = [profile.email, profile.name, profile.provider, profile.oauthId];
  const result = await query(sql, values);
  return result.rows[0];
}
