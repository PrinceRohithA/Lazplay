import { BrowserWindow } from "electron";
import { db } from "../storage/db";
import log from "electron-log";

const API_BASE = "https://play.lazplay.tech/api/v1";

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

/**
 * Refresh the access token using the stored refresh token.
 * Returns the new access token, or null if refresh fails.
 * Handles concurrent refresh calls by queuing them.
 */
async function refreshAccessToken(): Promise<string | null> {
  // If already refreshing, wait for the in-flight refresh to finish
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(resolve);
    });
  }

  isRefreshing = true;
  const { refreshToken } = db.getTokens();

  if (!refreshToken) {
    log.warn("[auth-fetch] No refresh token available — cannot refresh.");
    isRefreshing = false;
    refreshQueue.forEach((cb) => cb(null));
    refreshQueue = [];
    return null;
  }

  try {
    log.info("[auth-fetch] Access token expired — attempting refresh...");
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      log.warn("[auth-fetch] Token refresh failed:", res.status, body);
      isRefreshing = false;
      refreshQueue.forEach((cb) => cb(null));
      refreshQueue = [];
      return null;
    }

    const data = await res.json();
    const result = data.data ?? data;
    const newAccessToken: string = result.accessToken;
    const newRefreshToken: string = result.refreshToken;

    // Persist the new tokens
    db.setTokens(newAccessToken, newRefreshToken);
    log.info("[auth-fetch] Token refreshed successfully.");

    // Inject the new access token into the storeView so the website stays logged in too
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.executeJavaScript(`
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('accessToken', ${JSON.stringify(newAccessToken)});
              localStorage.setItem('refreshToken', ${JSON.stringify(newRefreshToken)});
              window.dispatchEvent(new Event('storage'));
            }
          `).catch(() => {});
        }
      }
    } catch (_) {}

    isRefreshing = false;
    refreshQueue.forEach((cb) => cb(newAccessToken));
    refreshQueue = [];
    return newAccessToken;
  } catch (err: any) {
    log.error("[auth-fetch] Token refresh threw:", err.message);
    isRefreshing = false;
    refreshQueue.forEach((cb) => cb(null));
    refreshQueue = [];
    return null;
  }
}

/**
 * Makes an authenticated fetch to the LazPlay API.
 * Automatically refreshes the access token on 401/SESSION_REVOKED and retries once.
 *
 * @param path  API path, e.g. "/auth/me"
 * @param init  Standard RequestInit options
 * @returns     The final Response
 */
export async function authFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const makeRequest = (token: string) => {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    };
    if (init.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    return fetch(`${API_BASE}${path}`, { ...init, headers });
  };

  const { token } = db.getTokens();
  if (!token) {
    throw new Error("Not authenticated — no access token stored.");
  }

  const res = await makeRequest(token);

  // If the server says the token is expired/revoked, try to refresh once
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      // Refresh failed — return the 401 so callers can handle it (e.g. prompt re-login)
      return res;
    }
    // Retry the original request with the new token
    return makeRequest(newToken);
  }

  return res;
}

/**
 * Like authFetch, but returns parsed JSON directly.
 * Throws on non-ok responses.
 */
export async function authFetchJson<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await authFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(
      new Error(body?.error?.message || body?.message || `HTTP ${res.status}`),
      { status: res.status, code: body?.error?.code || body?.code }
    );
  }
  const data = await res.json();
  return (data.data ?? data) as T;
}
