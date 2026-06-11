import { API_TIMEOUT_MS } from "./config.js";

export async function apiLogin(username, password) {
  return apiRequest("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
}

export async function apiRegister(username, password) {
  return apiRequest("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
}

export async function apiRequest(path, options, retries = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(path, { ...options, signal: controller.signal });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `HTTP ${response.status}`);
    }
    return body;
  } catch (err) {
    if (retries > 0 && err.name !== "AbortError") {
      await new Promise((r) => setTimeout(r, 300));
      return apiRequest(path, options, retries - 1);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
