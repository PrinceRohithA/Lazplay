import { env } from "../config/env.js";
import { createJwtToken } from "../utils/jwt.js";
import { findOrCreateUserFromOAuth } from "../services/auth.service.js";
import { buildMockLoginRedirectUrl, resolveOAuthProfileFromCode } from "../services/oauth.service.js";

export function login(req, res) {
  if (!env.MOCK_OAUTH_ENABLED) {
    return res.status(501).json({
      error: "OAuth provider is not configured. Enable MOCK_OAUTH_ENABLED for local development."
    });
  }

  const redirectUrl = buildMockLoginRedirectUrl();
  return res.redirect(302, redirectUrl);
}

export async function callback(req, res, next) {
  try {
    const code = String(req.query.code || "").trim();
    if (!code) {
      return res.status(400).json({
        error: "Missing OAuth code"
      });
    }

    const profile = resolveOAuthProfileFromCode(code);
    const user = await findOrCreateUserFromOAuth(profile);

    const token = createJwtToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    if (String(req.query.format || "").toLowerCase() === "json") {
      return res.json({
        token,
        user
      });
    }

    const frontendCallback = new URL("/auth/callback", env.FRONTEND_URL);
    frontendCallback.searchParams.set("token", token);
    return res.redirect(302, frontendCallback.toString());
  } catch (error) {
    return next(error);
  }
}
