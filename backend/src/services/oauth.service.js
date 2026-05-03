import crypto from "node:crypto";
import { env } from "../config/env.js";

function toBase64Url(jsonPayload) {
  return Buffer.from(JSON.stringify(jsonPayload), "utf8").toString("base64url");
}

function fromBase64Url(value) {
  const raw = Buffer.from(String(value || ""), "base64url").toString("utf8");
  return JSON.parse(raw);
}

function buildDefaultMockIdentity() {
  const oauthId = env.MOCK_OAUTH_EMAIL.split("@")[0] || `user-${crypto.randomUUID()}`;

  return {
    email: env.MOCK_OAUTH_EMAIL,
    name: env.MOCK_OAUTH_NAME,
    provider: env.MOCK_OAUTH_PROVIDER,
    oauthId
  };
}

export function buildMockLoginRedirectUrl() {
  const callbackUrl = new URL("/auth/callback", env.API_BASE_URL);
  const code = toBase64Url(buildDefaultMockIdentity());
  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("provider", env.MOCK_OAUTH_PROVIDER);
  return callbackUrl.toString();
}

export function resolveOAuthProfileFromCode(code) {
  if (!env.MOCK_OAUTH_ENABLED) {
    throw new Error("Real OAuth provider is not configured. Enable mock OAuth for local development.");
  }

  const profile = fromBase64Url(code);
  if (!profile?.email || !profile?.name || !profile?.oauthId) {
    throw new Error("Invalid OAuth callback payload.");
  }

  return {
    email: String(profile.email).toLowerCase(),
    name: String(profile.name),
    provider: String(profile.provider || env.MOCK_OAUTH_PROVIDER),
    oauthId: String(profile.oauthId)
  };
}
