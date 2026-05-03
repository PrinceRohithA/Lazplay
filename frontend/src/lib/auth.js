const TOKEN_KEY = "lazplay_jwt";
const USER_KEY = "lazplay_user";
const ROLE_ORDER = {
  player: 1,
  creator: 2,
  admin: 3
};

export function normalizeRole(role) {
  const normalized = String(role || "player").toLowerCase();
  return ROLE_ORDER[normalized] ? normalized : "player";
}

export function roleAtLeast(actualRole, requiredRole) {
  return (ROLE_ORDER[normalizeRole(actualRole)] || 0) >= (ROLE_ORDER[normalizeRole(requiredRole)] || 1);
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

export function readUserFromToken(token) {
  try {
    const [, payload] = String(token || "").split(".");
    if (!payload) {
      return null;
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    const decoded = JSON.parse(json);

    return {
      id: Number(decoded.sub || 0),
      name: decoded.name || "Player",
      email: decoded.email || "",
      role: normalizeRole(decoded.role),
      avatar: "LP"
    };
  } catch {
    return null;
  }
}

export function buildMockOAuthCode(profile) {
  const json = JSON.stringify(profile);
  const utf8 = new TextEncoder().encode(json);
  let binary = "";

  utf8.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
