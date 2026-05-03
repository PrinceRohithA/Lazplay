import { clearToken, getStoredToken } from "./auth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function apiRequest(path, options = {}) {
  const { auth = true, headers = {}, ...rest } = options;

  const requestHeaders = {
    Accept: "application/json",
    ...headers
  };

  if (auth) {
    const token = getStoredToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
    }

    const message =
      typeof payload === "string"
        ? payload || "Request failed"
        : payload?.error || "Request failed";

    throw new Error(message);
  }

  return payload;
}
