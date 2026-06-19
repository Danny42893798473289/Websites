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
  buySecondDie,
  buySecondDieTier,
  buySecondDieRpsUpgrade,
  buyTheme
} from "./economy.js";
import { doAscend } from "./progression.js";
import { doLuckyRoll, doSuperLuckyRoll, performRoll, performSecondRoll } from "./rolling.js";
import { challengeDuel, giveAdminResources, lookupProfile, refreshDuels, refreshLeaderboard, submitDuelRoll, updateAdminVisibility } from "./social.js";
import { save, resetLocalSave } from "./save.js";
import { setFeed } from "./feedback.js";
import {
  pinShowcaseEgg,
  renderCore,
  renderGlobalEvent,
  renderEggCodex,
  renderEggCollection,
  renderDiceShop,
  renderGemShop,
  renderShop,
  renderThemeShop,
  updateDailyUI,
  populateRarityFilters,
  syncFiltersFromUI
} from "./render.js";
import { sellEgg } from "./economy.js";
import { applyStaticUI, applyLanguage, onLanguageChange } from "./i18n.js";
import { refreshGuild } from "./guilds.js";

export function init() {
  initDeviceProfile();
  cacheElements();
  applyStaticUI();
  populateRarityFilters();
  bindEvents();
  runtime.activeTab = "roll";
  setActiveTab("roll");
  renderShop();
  renderGemShop();
  renderDiceShop();
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
        refreshGuild();
        refreshLeaderboard();
        refreshDuels();
      }
    });
  });
  if (runtime.el.loginForm) runtime.el.loginForm.addEventListener("submit", onLoginSubmit);
  bindClick(runtime.el.registerBtn, onRegisterSubmit);
  bindClick(runtime.el.logoutBtn, onLogout);
  bindClick(runtime.el.rollBtn, () => {
    performRoll(1, true);
    renderCore();
    save();
  });
  bindClick(runtime.el.rollBtn2, () => {
    performSecondRoll(1, true);
    renderCore();
    save();
  });
  bindClick(runtime.el.superLuckyRollBtn, () => {
    doSuperLuckyRoll();
    renderCore();
    save();
  });
  bindClick(runtime.el.luckyRollBtn, () => {
    doLuckyRoll();
    renderCore();
    save();
  });
  bindClick(runtime.el.sellRareBtn, sellRareEggs);
  bindClick(runtime.el.prestigeBtn, doPrestige);
  bindChange(runtime.el.languageSelect, () => {
    onLanguageChange();
    applyLanguage();
    if (runtime.state) save();
  });
  bindChange(runtime.el.darkModeToggle, onToggleDarkMode);
  bindChange(runtime.el.soundToggle, () => {
    if (runtime.state) {
      runtime.state.settings.soundEnabled = !!runtime.el.soundToggle.checked;
    }
    save();
  });
  bindChange(runtime.el.popupRaritySelect, () => {
    if (runtime.state && runtime.el.popupRaritySelect) {
      runtime.state.settings.popupMinRarity = runtime.el.popupRaritySelect.value || "Epic";
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
  bindClick(runtime.el.adminGrantBtn, giveAdminResources);

  bindFilterEvents();

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

  if (runtime.el.diceShopList) {
    runtime.el.diceShopList.addEventListener("click", (event) => {
      const buyDie = event.target.closest("button[data-buy-second-die]");
      if (buyDie && !buyDie.disabled) {
        buySecondDie();
        renderDiceShop();
        renderCore();
        save();
        return;
      }
      const buyTier = event.target.closest("button[data-buy-second-die-tier]");
      if (buyTier && !buyTier.disabled) {
        buySecondDieTier();
        renderDiceShop();
        renderCore();
        save();
        return;
      }
      const buyRps = event.target.closest("button[data-buy-second-die-rps]");
      if (buyRps && !buyRps.disabled) {
        buySecondDieRpsUpgrade(buyRps.getAttribute("data-buy-second-die-rps"));
        renderDiceShop();
        renderCore();
        save();
      }
    });
  }

  window.addEventListener("beforeunload", () => {
    save();
  });
}

function bindFilterEvents() {
  const onFilterChange = () => {
    syncFiltersFromUI();
    save();
    if (runtime.activeTab === "collection") {
      renderEggCollection();
      renderEggCodex();
    }
    if (runtime.activeTab === "shops") {
      renderShop();
      renderGemShop();
      renderDiceShop();
    }
  };
  [
    runtime.el.collectionSearch,
    runtime.el.collectionRarityFilter,
    runtime.el.collectionOwnedFilter,
    runtime.el.codexSearch,
    runtime.el.codexRarityFilter,
    runtime.el.codexOwnedFilter,
    runtime.el.codexShinyOnly,
    runtime.el.shopSearch,
    runtime.el.gemShopSearch
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", onFilterChange);
    el.addEventListener("change", onFilterChange);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    init();
    applyLanguage();
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
