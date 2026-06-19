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
import { performRoll, performSecondRoll, getPrimaryRPS, getSecondDieRPS, processPendingOfflineRolls } from "./rolling.js";
import { hasSecondDie } from "./config.js";
import { renderCore, renderHeavyForTab, renderFusionLab } from "./render.js";
import { fetchGlobalEventFromServer, refreshGlobalEvent } from "./events.js";
import { tryAutoFusion, hasAutoFusionUnlock, getAutoFusionIntervalMs } from "./progression.js";

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

  if (runtime.state.settings.autoRollEnabled !== false) {
    const rps1 = getPrimaryRPS();
    const rps2 = getSecondDieRPS();
    runtime.rollBuffer += rps1 * dtSeconds;
    runtime.rollBuffer2 += rps2 * dtSeconds;
    const cap = runtime.isMobile ? MAX_ROLLS_PER_TICK_MOBILE : MAX_ROLLS_PER_TICK;
    const toProcess1 = Math.min(Math.floor(runtime.rollBuffer), cap);
    if (toProcess1 > 0) {
      runtime.rollBuffer -= toProcess1;
      try {
        performRoll(toProcess1, false);
      } catch (err) {
        console.error("Auto-roll tick failed:", err);
        runtime.rollBuffer = 0;
      }
    }
    const cap2 = Math.max(0, cap - toProcess1);
    const toProcess2 = Math.min(Math.floor(runtime.rollBuffer2), cap2);
    if (toProcess2 > 0 && hasSecondDie(runtime.state)) {
      runtime.rollBuffer2 -= toProcess2;
      try {
        performSecondRoll(toProcess2, false);
      } catch (err) {
        console.error("Die 2 auto-roll tick failed:", err);
        runtime.rollBuffer2 = 0;
      }
    }
  }

  if (hasAutoFusionUnlock(runtime.state) && runtime.state.settings.autoFusionEnabled) {
    const fusionInterval = getAutoFusionIntervalMs(runtime.state);
    runtime.fusionBuffer = Number(runtime.fusionBuffer || 0) + dtSeconds * 1000;
    if (runtime.fusionBuffer >= fusionInterval) {
      runtime.fusionBuffer -= fusionInterval;
      try {
        const crafted = tryAutoFusion();
        if (crafted && runtime.activeTab === "progression") {
          renderFusionLab();
        }
      } catch (err) {
        console.error("Auto-fusion tick failed:", err);
        runtime.fusionBuffer = 0;
      }
    }
  } else {
    runtime.fusionBuffer = 0;
  }
}
