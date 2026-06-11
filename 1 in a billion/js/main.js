import { cacheElements } from "./elements.js";
import { runtime } from "./runtime.js";
import { initDeviceProfile } from "./device.js";
import {
  onLoginSubmit,
  onLogout,
  onRegisterSubmit,
  onToggleDarkMode
} from "./auth.js";
import { setActiveTab } from "./tabs.js";
import {
  claimDailyReward,
  doPrestige,
  sellRareEggs,
  buyTheme
} from "./economy.js";
import { doAscend } from "./progression.js";
import { doLuckyRoll, performRoll } from "./rolling.js";
import { challengeDuel, giveAdminCoins, lookupProfile, refreshDuels, refreshLeaderboard, submitDuelRoll, updateAdminVisibility } from "./social.js";
import { save, resetLocalSave } from "./save.js";
import { setFeed } from "./feedback.js";
import {
  pinShowcaseEgg,
  renderGlobalEvent,
  renderEggCodex,
  renderEggCollection,
  renderGemShop,
  renderShop,
  renderThemeShop,
  updateDailyUI
} from "./render.js";
import { sellEgg } from "./economy.js";

export function init() {
  initDeviceProfile();
  cacheElements();
  bindEvents();
  runtime.activeTab = "roll";
  setActiveTab("roll");
  renderShop();
  renderGemShop();
  renderGlobalEvent();
  updateDailyUI();
}

function bindClick(el, handler) {
  if (el) el.addEventListener("click", handler);
}

function bindChange(el, handler) {
  if (el) el.addEventListener("change", handler);
}

export function bindEvents() {
  runtime.el.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveTab(btn.getAttribute("data-tab"));
      if (btn.getAttribute("data-tab") === "social") {
        updateAdminVisibility();
      }
    });
  });
  if (runtime.el.loginForm) runtime.el.loginForm.addEventListener("submit", onLoginSubmit);
  bindClick(runtime.el.registerBtn, onRegisterSubmit);
  bindClick(runtime.el.logoutBtn, onLogout);
  bindClick(runtime.el.rollBtn, () => performRoll(1, true));
  bindClick(runtime.el.sellRareBtn, sellRareEggs);
  bindClick(runtime.el.prestigeBtn, doPrestige);
  bindClick(runtime.el.luckyRollBtn, doLuckyRoll);
  bindChange(runtime.el.darkModeToggle, onToggleDarkMode);
  bindChange(runtime.el.soundToggle, () => {
    if (runtime.state) {
      runtime.state.settings.soundEnabled = !!runtime.el.soundToggle.checked;
    }
    save();
  });
  bindClick(runtime.el.dailyBtn, claimDailyReward);
  bindClick(runtime.el.saveBtn, () => {
    save();
    setFeed("Game saved.");
  });
  bindClick(runtime.el.resetBtn, resetLocalSave);
  bindClick(runtime.el.ascendBtn, doAscend);
  bindClick(runtime.el.refreshLeaderboardBtn, refreshLeaderboard);
  bindChange(runtime.el.leaderboardMode, refreshLeaderboard);
  bindClick(runtime.el.profileLookupBtn, lookupProfile);
  bindClick(runtime.el.duelChallengeBtn, challengeDuel);
  bindClick(runtime.el.duelRefreshBtn, refreshDuels);
  bindClick(runtime.el.duelRollBtn, submitDuelRoll);
  bindClick(runtime.el.adminGiveCoinsBtn, giveAdminCoins);

  if (runtime.el.eggLog) {
    runtime.el.eggLog.addEventListener("click", (event) => {
      const sellBtn = event.target.closest("button[data-sell-egg]");
      if (sellBtn) {
        sellEgg(sellBtn.getAttribute("data-sell-egg"), false);
        renderEggCollection();
        renderEggCodex();
        return;
      }
      const shinyBtn = event.target.closest("button[data-sell-shiny]");
      if (shinyBtn) {
        sellEgg(shinyBtn.getAttribute("data-sell-shiny"), true);
        renderEggCollection();
        renderEggCodex();
      }
    });
  }

  if (runtime.el.eggCodex) {
    runtime.el.eggCodex.addEventListener("click", (event) => {
      const expandBtn = event.target.closest("button[data-expand-shiny-codex]");
      if (expandBtn) {
        runtime.showShinyCodex = true;
        renderEggCodex();
        return;
      }
      const pinBtn = event.target.closest("button[data-pin-egg]");
      if (pinBtn) {
        pinShowcaseEgg(pinBtn.getAttribute("data-pin-egg"), pinBtn.getAttribute("data-pin-shiny") === "true");
      }
    });
  }

  if (runtime.el.themeShopList) {
    runtime.el.themeShopList.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-theme-action]");
      if (!btn || btn.disabled) return;
      buyTheme(btn.getAttribute("data-theme-action"));
      renderThemeShop();
      save();
    });
  }

  window.addEventListener("beforeunload", () => {
    save();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    init();
    // Ensure admin sections start hidden for non-Danny (the CSS rule + this keeps it that way until loginAs adds the class).
    updateAdminVisibility();
  } catch (err) {
    console.error("Init failed:", err);
    const errEl = document.getElementById("login-error");
    if (errEl) {
      errEl.textContent = "Game failed to load. Please refresh the page.";
      errEl.classList.remove("hidden");
    }
  }
});
