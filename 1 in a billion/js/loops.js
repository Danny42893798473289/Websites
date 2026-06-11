import {
  MAX_ROLLS_PER_TICK,
  MAX_ROLLS_PER_TICK_MOBILE,
  SAVE_INTERVAL_MS,
  STREAK_TIMEOUT_MS,
  UI_REFRESH_MS,
  UI_REFRESH_MS_MOBILE
} from "./config.js";
import { runtime } from "./runtime.js";
import { save } from "./save.js";
import { performRoll, getCurrentRPS, processPendingOfflineRolls } from "./rolling.js";
import { renderCore, renderHeavyForTab } from "./render.js";
import { fetchGlobalEventFromServer, refreshGlobalEvent } from "./events.js";

export function startLoops() {
  stopLoops();
  runtime.lastLoopTime = performance.now();
  runtime.loopTimer = setInterval(gameTick, runtime.isMobile ? 150 : 100);
  const uiInterval = runtime.isMobile ? UI_REFRESH_MS_MOBILE : UI_REFRESH_MS;
  runtime.uiTimer = setInterval(() => {
    if (shouldPauseForHiddenPage()) return;
    renderCore();
  }, uiInterval);
  runtime.autoSaveTimer = setInterval(save, SAVE_INTERVAL_MS);

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", resumeVisibleLoop);
  window.addEventListener("pageshow", resumeVisibleLoop);
}

export function stopLoops() {
  if (runtime.loopTimer) clearInterval(runtime.loopTimer);
  if (runtime.uiTimer) clearInterval(runtime.uiTimer);
  if (runtime.autoSaveTimer) clearInterval(runtime.autoSaveTimer);
  runtime.loopTimer = null;
  runtime.uiTimer = null;
  runtime.autoSaveTimer = null;
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("focus", resumeVisibleLoop);
  window.removeEventListener("pageshow", resumeVisibleLoop);
}

function onVisibilityChange() {
  if (!document.hidden && runtime.state) {
    resumeVisibleLoop();
  }
}

function resumeVisibleLoop() {
  if (!runtime.state) return;
  runtime.lastLoopTime = performance.now();
  renderCore();
  renderHeavyForTab(runtime.activeTab);
}

function shouldPauseForHiddenPage() {
  // Some mobile browsers report document.hidden around login/autofill even after
  // the app is visible again, which can leave auto-roll apparently stopped.
  return document.hidden && !runtime.isMobile;
}

export function gameTick() {
  if (!runtime.state || runtime.offlineProgressRunning || shouldPauseForHiddenPage()) return;
  if (processPendingOfflineRolls()) {
    return;
  }
  refreshGlobalEvent();
  if (Date.now() - runtime.state.currentEventFetchedAt > 60 * 60 * 1000) {
    void fetchGlobalEventFromServer();
  }
  const now = performance.now();
  const dtSeconds = Math.max(0, (now - runtime.lastLoopTime) / 1000);
  runtime.lastLoopTime = now;
  runtime.state.playtimeMs += dtSeconds * 1000;

  if (runtime.state.manualStreak > 0 && Date.now() - runtime.state.lastManualRollAt > STREAK_TIMEOUT_MS) {
    runtime.state.manualStreak = 0;
  }

  const currentRPS = getCurrentRPS();
  runtime.rollBuffer += currentRPS * dtSeconds;
  const cap = runtime.isMobile ? MAX_ROLLS_PER_TICK_MOBILE : MAX_ROLLS_PER_TICK;
  const toProcess = Math.min(Math.floor(runtime.rollBuffer), cap);
  if (toProcess > 0) {
    runtime.rollBuffer -= toProcess;
    try {
      performRoll(toProcess, false);
    } catch (err) {
      console.error("Auto-roll tick failed:", err);
      runtime.rollBuffer = 0;
    }
  }
}
