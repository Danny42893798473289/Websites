import { apiRequest } from "./api.js";
import { runtime } from "./runtime.js";
import { createDefaultState, deepMerge, sanitizeState } from "./state.js";
import { renderAll, renderCore } from "./render.js";
import { setFeed } from "./feedback.js";

let remoteSaveTimer = null;
let remoteSaveInFlight = false;
let pendingRemoteSave = null;

export function saveKey(username) {
  return `egg_roller_idle_save_${username}`;
}

export function loadLocalSave(username) {
  const raw = localStorage.getItem(saveKey(username));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    sanitizeState(parsed);
    return parsed;
  } catch (err) {
    console.warn("Failed to load local save:", err);
    return null;
  }
}

function loadRemoteSaveWithTimeout(username, timeoutMs = 6000) {
  if (!runtime.backendAvailable) return Promise.resolve(null);
  return Promise.race([
    loadRemoteSave(username),
    new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))
  ]);
}

export async function loadRemoteSave(username) {
  if (!runtime.backendAvailable) return null;
  try {
    const data = await apiRequest(`/api/save/${encodeURIComponent(username)}`, { method: "GET" });
    if (!data || !data.state) return null;
    sanitizeState(data.state);
    return data.state;
  } catch (err) {
    runtime.backendAvailable = false;
    return null;
  }
}

async function flushRemoteSave() {
  if (remoteSaveInFlight || !pendingRemoteSave) return;
  const payload = pendingRemoteSave;
  pendingRemoteSave = null;
  remoteSaveInFlight = true;
  try {
    await apiRequest(`/api/save/${encodeURIComponent(payload.username)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: payload.state })
    });
    runtime.backendAvailable = true;
  } catch (err) {
    runtime.backendAvailable = false;
    console.warn("Remote save failed:", err);
  } finally {
    remoteSaveInFlight = false;
    if (pendingRemoteSave) {
      void flushRemoteSave();
    }
  }
}

export function save() {
  if (!runtime.state || !runtime.currentUser) return;
  runtime.state.lastSavedAt = Date.now();
  runtime.state.lastSessionAt = Date.now();
  try {
    localStorage.setItem(saveKey(runtime.currentUser), JSON.stringify(runtime.state));
  } catch (err) {
    console.warn("Local save failed:", err);
  }
  if (runtime.backendAvailable) {
    pendingRemoteSave = {
      username: runtime.currentUser,
      state: JSON.parse(JSON.stringify(runtime.state))
    };
    if (remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(() => {
      remoteSaveTimer = null;
      void flushRemoteSave();
    }, 400);
  }
}

export function resetLocalSave() {
  if (!runtime.currentUser) return;
  const confirmed = window.confirm("Delete this account's local progress and re-sync from defaults?");
  if (!confirmed) return;
  localStorage.removeItem(saveKey(runtime.currentUser));
  const localDefaults = { coins: 0, gems: 0, rolls: 0 };
  runtime.state = createDefaultState(runtime.currentUser, localDefaults);
  setFeed("Local save reset. Defaults loaded.");
  renderAll();
  save();
}

export function mergeSaveWithDefaultsFast(username, userRecord) {
  const defaults = createDefaultState(username, userRecord);
  const localSave = loadLocalSave(username);
  if (!localSave) {
    sanitizeState(defaults);
    return defaults;
  }

  try {
    const merged = deepMerge(defaults, localSave);
    merged.version = 1;
    sanitizeState(merged);
    return merged;
  } catch (err) {
    console.warn("Local save merge failed, using defaults:", err);
    sanitizeState(defaults);
    return defaults;
  }
}

export async function syncRemoteSaveIfNewer(username, userRecord) {
  const remoteSave = await loadRemoteSaveWithTimeout(username, 8000);
  if (!remoteSave || !runtime.state) return false;

  const localTs = Number(runtime.state.lastSavedAt || 0);
  const remoteTs = Number(remoteSave.lastSavedAt || 0);
  if (remoteTs <= localTs) return false;

  try {
    const defaults = createDefaultState(username, userRecord);
    runtime.state = deepMerge(defaults, remoteSave);
    runtime.state.version = 1;
    sanitizeState(runtime.state);
    renderCore();
    return true;
  } catch (err) {
    console.warn("Remote save merge failed:", err);
    return false;
  }
}

export async function mergeSaveWithDefaults(username, userRecord) {
  const fast = mergeSaveWithDefaultsFast(username, userRecord);
  await syncRemoteSaveIfNewer(username, userRecord);
  return runtime.state || fast;
}
