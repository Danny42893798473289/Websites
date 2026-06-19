import {
  ACHIEVEMENTS,
  ALL_EGG_BY_ID,
  ASCENSION_CONFIG,
  DICE_AP_COST,
  MAX_DICE_PURCHASES,
  getDiceInfo,
  getNextDiceUpgrade,
  COMPANION_VARIANTS,
  DAILY_REWARD_COOLDOWN_MS,
  EGG_TYPES,
  EGG_VARIANTS,
  FUSION_EGG_BY_ID,
  FUSION_EGG_TYPES,
  FUSION_RECIPES,
  GEM_SHOP_ITEMS,
  LUCKY_ROLL_COST_GEMS,
  SECOND_DIE_GEM_COST,
  SECOND_DIE_BASE_RPS,
  SECOND_DIE_RPS_ITEMS,
  SECOND_DIE_TIER_UPGRADE_COSTS,
  MAX_SECOND_DIE_PURCHASES,
  getNextSecondDieUpgrade,
  getSecondDiePurchases,
  getPrimaryDieInfo,
  getSecondDieInfo,
  hasSecondDie,
  PRESTIGE_MILESTONES,
  PRESTIGE_SHOP_ITEMS,
  PRESTIGE_TARGET_ROLLS,
  RELIC_DEFS,
  RARITIES,
  SET_BONUS_CONFIG,
  SHOWCASE_SLOT_COUNT,
  SHOP_ITEMS,
  THEME_SHOP,
  WEEKLY_CHALLENGE_TEMPLATES,
  getCodexFoundCount,
  getRollableCodexFoundCount,
  getFusionCodexFoundCount,
  getShinyCodexFoundCount,
  getTitleLabel,
  getRarityEggCount
} from "./config.js";
import { runtime } from "./runtime.js";
import { isEggDiscovered, isShinyDiscovered } from "./state.js";
import { escapeHtml, formatDuration, formatNumber, matchesQuery } from "./utils.js";
import {
  buyGemUpgrade,
  buyTheme,
  buyUpgrade,
  getCoinShopEffectText,
  getGemShopEffectText,
  getPrestigeShopEffectText,
  getSecondDieRpsEffectText,
  getUpgradeCost,
  buyPrestigeUpgrade
} from "./economy.js";
import { getCurrentGlobalEvent } from "./events.js";
import {
  claimIncubatorSlot,
  getIncubatorMaxSlots,
  getIncubatorProgress,
  sanitizeIncubator,
  startIncubating
} from "./incubator.js";
import {
  equipRelic,
  formatRelicUnlockText,
  getRelicMaxSlots,
  isRelicUnlocked
} from "./relics.js";
import {
  activateCompanion,
  buyAscensionUpgrade,
  buyDiceUpgrade,
  canCraftFusionRecipe,
  craftFusion,
  formatCompanionBonus,
  getAscensionUpgradeEffectText,
  getAutoFusionStatusText,
  getFusionRecipeSearchText,
  getFusionRecipeTier,
  hasAutoFusionUnlock,
  hatchCompanion,
  renderFusionChainsVisualizer
} from "./progression.js";
import { save } from "./save.js";
import { getPrimaryRPS, getSecondDieRPS, getManualStreakBonus } from "./rolling.js";
import { isThemeUnlocked } from "./themes.js";
import { claimChallenge, ensureWeeklyChallenges } from "./challenges.js";
import { getActiveSeason, getSeasonTimeRemaining } from "./seasons.js";
import { replayClass } from "./animations.js";
import {
  t, tAchievement, tEventLabel, tGemShopName, tRarity, tSetBonusLabel,
  tShopName, tThemeDesc, tThemeName, tTitleLabel
} from "./i18n.js";

export function renderCore() {
  if (!runtime.state) return;
  try {
    renderCurrency();
    updateActionPanels();
    renderStats();
    renderGlobalEvent();
    updateDailyUI();
    renderSeasonBanner();
    renderActiveTabLive();
    tickIncubatorTimers();
    if (runtime.el.darkModeToggle) {
      runtime.el.darkModeToggle.checked = !!runtime.state.settings.darkMode;
    }
    if (runtime.el.soundToggle) {
      runtime.el.soundToggle.checked = !!runtime.state.settings.soundEnabled;
    }
    if (runtime.el.popupRaritySelect) {
      runtime.el.popupRaritySelect.value = runtime.state.settings.popupMinRarity || "Epic";
    }
    if (runtime.el.autoRollToggle) {
      runtime.el.autoRollToggle.checked = runtime.state.settings.autoRollEnabled !== false;
    }
    renderAutoRollStatus();
  } catch (err) {
    console.error("Render core error:", err);
  }
}

function renderActiveTabLive() {
  switch (runtime.activeTab) {
    case "roll":
      renderPrestigeMilestones();
      break;
    case "shops":
      renderShop();
      renderGemShop();
      renderDiceShop();
      break;
    case "collection":
      renderEggCollection();
      renderMuseumShowcase();
      break;
    case "progression":
      updateAutoFusionStatus();
      break;
    default:
      break;
  }
}

export function renderHeavyForTab(tabId) {
  if (!runtime.state) return;
  const tab = tabId || runtime.activeTab || "roll";
  try {
    renderHeavyForTabInner(tab);
  } catch (err) {
    console.error(`Render error for tab "${tab}":`, err);
  }
}

function renderHeavyForTabInner(tab) {
  switch (tab) {
    case "roll":
      renderEventLog();
      renderPrestigeMilestones();
      renderSeasonBanner();
      break;
    case "collection":
      renderEggCollection();
      renderMuseumShowcase();
      renderEggCodex();
      break;
    case "shops":
      renderShop();
      renderGemShop();
      renderDiceShop();
      break;
    case "progression":
      renderSetBonuses();
      renderCompanions();
      renderFusionLab();
      renderWeeklyChallenges();
      renderIncubator();
      renderRelics();
      renderPrestigeShop();
      renderAscension();
      break;
    case "social":
      renderGlobalEvent();
      import("./social.js").then(({ refreshLeaderboard, refreshDuels }) => {
        void refreshLeaderboard();
        void refreshDuels();
      });
      import("./guilds.js").then(({ refreshGuild }) => {
        void refreshGuild();
      });
      break;
    case "stats":
      renderAchievements();
      break;
    case "settings":
      renderThemeShop();
      break;
    default:
      break;
  }
}

export function renderAll() {
  if (!runtime.state) return;
  try {
    renderCore();
    renderHeavyForTab(runtime.activeTab);
  } catch (err) {
    console.error("Render error:", err);
  }
}

export function renderCurrency() {
  const coinDelta = Math.floor(runtime.state.coins - runtime.previousCoins);
  const gemDelta = Math.floor(runtime.state.gems - runtime.previousGems);
  if (!runtime.isMobile) {
    if (Math.floor(runtime.state.coins) !== Math.floor(runtime.previousCoins)) {
      pulseValue(runtime.el.coins);
    }
    if (Math.floor(runtime.state.gems) !== Math.floor(runtime.previousGems)) {
      pulseValue(runtime.el.gems);
    }
  }
  runtime.el.coins.textContent = formatNumber(Math.floor(runtime.state.coins));
  runtime.el.gems.textContent = formatNumber(Math.floor(runtime.state.gems));
  runtime.el.rps.textContent = getPrimaryRPS().toFixed(2);
  const ownedSecond = hasSecondDie(runtime.state);
  if (runtime.el.rps2Row) runtime.el.rps2Row.classList.toggle("hidden", !ownedSecond);
  if (runtime.el.rps2) runtime.el.rps2.textContent = getSecondDieRPS().toFixed(2);
  if (coinDelta > 0) showFloatingGain(runtime.el.coins.parentElement, `+${formatNumber(coinDelta)}`, "coin");
  if (gemDelta > 0) showFloatingGain(runtime.el.gems.parentElement, `+${formatNumber(gemDelta)}`, "gem");
  runtime.previousCoins = runtime.state.coins;
  runtime.previousGems = runtime.state.gems;
}

export function updateActionPanels() {
  const streakBonusPercent = Math.round(getManualStreakBonus() * 100);
  runtime.el.streakCount.textContent = formatNumber(runtime.state.manualStreak);
  runtime.el.streakBonus.textContent = `${streakBonusPercent}%`;
  if (runtime.el.diceType) {
    const dice = getPrimaryDieInfo(runtime.state);
    runtime.el.diceType.textContent = `${dice.label} (1–${dice.sides})`;
  }
  if (runtime.el.rollBtn1Label) {
    const dice = getPrimaryDieInfo(runtime.state);
    runtime.el.rollBtn1Label.textContent = dice.label;
  }
  if (runtime.el.luckyRollLabel) {
    runtime.el.luckyRollLabel.textContent = getPrimaryDieInfo(runtime.state).label;
  }

  const ownedSecond = hasSecondDie(runtime.state);
  if (runtime.el.secondDiceRow) runtime.el.secondDiceRow.classList.toggle("hidden", !ownedSecond);
  if (runtime.el.rollBtn2) runtime.el.rollBtn2.classList.toggle("hidden", !ownedSecond);
  if (runtime.el.superLuckyRollBtn) runtime.el.superLuckyRollBtn.classList.toggle("hidden", !ownedSecond);
  if (ownedSecond) {
    const second = getSecondDieInfo(runtime.state);
    if (runtime.el.secondDiceType) {
      runtime.el.secondDiceType.textContent = `${second.label} (1–${second.sides})`;
    }
    if (runtime.el.rollBtn2Label) runtime.el.rollBtn2Label.textContent = second.label;
    if (runtime.el.superLuckyRollLabel) runtime.el.superLuckyRollLabel.textContent = second.label;
  }

  const now = Date.now();
  const ready = now >= runtime.state.luckyRollAvailableAt;
  if (runtime.el.luckyRollBtn) {
    runtime.el.luckyRollBtn.disabled = !ready || runtime.state.gems < LUCKY_ROLL_COST_GEMS;
  }
  if (runtime.el.luckyRollTimer) {
    runtime.el.luckyRollTimer.textContent = ready
      ? t("roll.gemCost", { cost: formatNumber(LUCKY_ROLL_COST_GEMS) })
      : formatDuration(runtime.state.luckyRollAvailableAt - now);
  }

  if (ownedSecond && runtime.el.superLuckyRollBtn) {
    const superReady = now >= runtime.state.superLuckyRollAvailableAt;
    runtime.el.superLuckyRollBtn.disabled = !superReady || runtime.state.gems < LUCKY_ROLL_COST_GEMS;
    if (runtime.el.superLuckyTimer) {
      runtime.el.superLuckyTimer.textContent = superReady
        ? t("roll.gemCost", { cost: formatNumber(LUCKY_ROLL_COST_GEMS) })
        : formatDuration(runtime.state.superLuckyRollAvailableAt - now);
    }
  }
}

export function pulseValue(element) {
  if (!element) return;
  element.classList.remove("value-pulse");
  void element.offsetWidth;
  element.classList.add("value-pulse");
}

export function showFloatingGain(target, text, kind) {
  if (!target || runtime.isMobile) return;
  const gain = document.createElement("span");
  gain.className = `floating-gain ${kind}`;
  gain.textContent = text;
  target.appendChild(gain);
  setTimeout(() => {
    gain.remove();
  }, 900);
}

function renderAutoRollStatus() {
  if (!runtime.el.autoRollStatus || !runtime.state) return;
  const on = runtime.state.settings.autoRollEnabled !== false;
  runtime.el.autoRollStatus.textContent = on ? t("roll.autoRollOn") : t("roll.autoRollPaused");
  runtime.el.autoRollStatus.classList.toggle("paused", !on);
}

export function renderEggCollection() {
  const filters = runtime.state?.settings?.filters || {};
  const hasAnyEgg =
    RARITIES.some((r) => getRarityEggCount(runtime.state, r.name) > 0) ||
    FUSION_EGG_TYPES.some((egg) => Number(runtime.state.eggCollection[egg.id] || 0) > 0);
  if (!hasAnyEgg) {
    runtime.el.eggLog.innerHTML = `<div class="empty-state muted">${t("collection.empty")}</div>`;
    return;
  }
  const rows = RARITIES.filter((r) => {
    if (filters.collectionRarity && filters.collectionRarity !== "all" && r.name !== filters.collectionRarity) return false;
    return true;
  }).map((r) => {
    const total = runtime.state ? getRarityEggCount(runtime.state, r.name) : 0;
    const variants = (EGG_VARIANTS[r.name] || [])
      .map((variant) => {
        const count = runtime.state ? runtime.state.eggCollection[variant.id] || 0 : 0;
        const shinyCount = runtime.state ? runtime.state.shinyCollection[variant.id] || 0 : 0;
        const unlocked = runtime.state ? isEggDiscovered(runtime.state, variant.id) : false;
        if (filters.collectionOwned === "owned" && count <= 0 && shinyCount <= 0) return "";
        if (filters.collectionOwned === "locked" && unlocked) return "";
        if (!matchesQuery(variant.name, filters.collectionSearch)) return "";
        if (count <= 0 && shinyCount <= 0) return "";
        const sellButton = count > 0 && r.gemValue > 0
          ? `<button class="small" data-sell-egg="${variant.id}">${t("collection.sell1")}</button>`
          : "";
        const shinyButton = shinyCount > 0 && r.gemValue > 0
          ? `<button class="small shiny-button" data-sell-shiny="${variant.id}">${t("status.sellShiny")}</button>`
          : "";
        return `
            <div class="egg-sub-item">
              <span>${escapeHtml(variant.name)}${shinyCount > 0 ? ` <span class="shiny-pill">${t("status.shiny")} x${formatNumber(shinyCount)}</span>` : ""}</span>
              <span class="collection-actions">
                <span>${formatNumber(count)}</span>
                ${sellButton}
                ${shinyButton}
              </span>
            </div>
          `;
      })
      .filter(Boolean)
      .join("");

    return `
        <div class="egg-rarity-group">
          <div class="egg-item">
            <div>
              <strong style="color:${r.color}">${tRarity(r.name)}</strong>
              <div class="muted">${t("collection.odds", { odds: formatNumber(r.oneIn) })}</div>
            </div>
            <div>${formatNumber(total)}</div>
          </div>
          ${variants || `<div class="egg-sub-item muted">${t("collection.noVariants")}</div>`}
        </div>
      `;
  });
  const fusionRows = FUSION_EGG_TYPES
    .map((egg) => {
      const count = Number(runtime.state.eggCollection[egg.id] || 0);
      if (count <= 0) return "";
      const sellButton = Number(egg.gemValue || 0) > 0 ? `<button class="small" data-sell-egg="${egg.id}">${t("collection.sell1")}</button>` : "";
      return `
          <div class="egg-sub-item">
            <span style="color:${egg.color}">${escapeHtml(egg.name)} [${tRarity("Fusion")}]</span>
            <span class="collection-actions">
              <span>${formatNumber(count)}</span>
              ${sellButton}
            </span>
          </div>
        `;
    })
    .filter(Boolean)
    .join("");

  const fusionSection = `
      <div class="egg-rarity-group">
        <div class="egg-item">
          <div>
            <strong style="color:#a855f7">${t("status.fusionEggs")}</strong>
            <div class="muted">${t("collection.craftedInLab")}</div>
          </div>
          <div>${formatNumber(FUSION_EGG_TYPES.reduce((sum, egg) => sum + Number(runtime.state.eggCollection[egg.id] || 0), 0))}</div>
        </div>
        ${fusionRows || `<div class="egg-sub-item muted">${t("collection.noFusion")}</div>`}
      </div>
    `;

  runtime.el.eggLog.innerHTML = rows.join("") + fusionSection;
}

export function renderEggCodex() {
  const filters = runtime.state?.settings?.filters || {};
  const discovered = getCodexFoundCount(runtime.state);
  const total = EGG_TYPES.length + FUSION_EGG_TYPES.length;
  const rollableFound = getRollableCodexFoundCount(runtime.state);
  const fusionFound = getFusionCodexFoundCount(runtime.state);
  const shinyDiscovered = getShinyCodexFoundCount(runtime.state);
  const shinyTotal = EGG_TYPES.length;
  const rows = RARITIES.filter((r) => {
    if (filters.codexRarity && filters.codexRarity !== "all" && r.name !== filters.codexRarity) return false;
    return true;
  }).map((r) => {
    const variantRows = (EGG_VARIANTS[r.name] || [])
      .map((variant) => {
        const owned = runtime.state ? Number(runtime.state.eggCollection[variant.id] || 0) : 0;
        const shinyOwned = runtime.state ? Number(runtime.state.shinyCollection[variant.id] || 0) : 0;
        const unlocked = runtime.state ? isEggDiscovered(runtime.state, variant.id) : false;
        if (filters.codexOwned === "owned" && !unlocked) return "";
        if (filters.codexOwned === "locked" && unlocked) return "";
        if (!matchesQuery(variant.name, filters.codexSearch)) return "";
        const title = unlocked ? variant.name : "???";
        const description = unlocked ? variant.description : t("status.rollDiscover");
        const status = unlocked ? (owned > 0 ? t("status.unlocked") : t("status.discoveredSold")) : t("status.locked");
        const titleColor = unlocked ? r.color : "var(--muted)";

        return `
            <div class="codex-item ${unlocked ? "" : "locked"}">
              <div class="codex-title">
                <strong style="color:${titleColor}">${title}</strong>
                <span class="codex-status">${status}</span>
              </div>
              <div class="muted">${description}</div>
              <div class="muted">${unlocked ? t("status.rarity", { name: tRarity(r.name), odds: formatNumber(r.oneIn) }) : t("status.rarityHidden")}</div>
              <div class="muted">${t("status.owned", { n: formatNumber(owned) })}${shinyOwned > 0 ? ` | ${t("status.shiniesOwned", { n: formatNumber(shinyOwned) })}` : ""}</div>
              ${unlocked || shinyOwned > 0 ? `<div class="settings-row"><button class="small" data-pin-egg="${variant.id}" data-pin-shiny="false">${t("status.pin")}</button>${shinyOwned > 0 ? `<button class="small shiny-button" data-pin-egg="${variant.id}" data-pin-shiny="true">${t("status.pinShiny")}</button>` : ""}</div>` : ""}
            </div>
          `;
      })
      .join("");

    if (!variantRows) return "";
    return `
        <div class="codex-rarity-group">
          <div class="codex-rarity-header" style="color:${r.color}">${tRarity(r.name)}</div>
          ${variantRows}
        </div>
      `;
  });

  const fusionCodexRows = FUSION_EGG_TYPES.map((egg) => {
    const owned = Number(runtime.state.eggCollection[egg.id] || 0);
    const unlocked = isEggDiscovered(runtime.state, egg.id);
    return `
        <div class="codex-item ${unlocked ? "" : "locked"}">
          <div class="codex-title">
            <strong style="color:${unlocked ? egg.color : "var(--muted)"}">${unlocked ? escapeHtml(egg.name) : "???"}</strong>
            <span class="codex-status">${unlocked ? (owned > 0 ? t("status.unlocked") : t("status.discoveredSold")) : t("status.locked")}</span>
          </div>
          <div class="muted">${unlocked ? escapeHtml(egg.description) : t("status.fuseDiscover")}</div>
          <div class="muted">${unlocked ? t("status.rarityFusion") : t("status.rarityHidden")}</div>
          <div class="muted">${t("status.owned", { n: formatNumber(owned) })}</div>
          ${unlocked ? `<div class="settings-row"><button class="small" data-pin-egg="${egg.id}" data-pin-shiny="false">${t("status.pin")}</button></div>` : ""}
        </div>
      `;
  }).join("");

  const fusionSection = `
      <div class="codex-rarity-group">
        <div class="codex-rarity-header" style="color:#a855f7">${tRarity("Fusion")}</div>
        ${fusionCodexRows}
      </div>
    `;

  const showShinyDetails = !runtime.isMobile || runtime.showShinyCodex;
  const shinyOnly = !!filters.codexShinyOnly;
  const shinyRows = showShinyDetails && !shinyOnly
    ? RARITIES.map((r) => {
        const variantRows = (EGG_VARIANTS[r.name] || []).map((variant) => {
          const unlocked = isShinyDiscovered(runtime.state, variant.id);
          const owned = Number(runtime.state.shinyCollection[variant.id] || 0);
          return `
              <div class="codex-item ${unlocked ? "shiny-entry" : "locked"}">
                <div class="codex-title">
                  <strong style="color:${unlocked ? r.color : "var(--muted)"}">${unlocked ? t("codex.shinyPrefix", { name: escapeHtml(variant.name) }) : "???"}</strong>
                  <span class="codex-status">${unlocked ? (owned > 0 ? t("status.shinyUnlocked") : t("status.shinyFoundSold")) : t("status.locked")}</span>
                </div>
                <div class="muted">${unlocked ? t("status.shinyHint") : t("status.shinyFind")}</div>
                <div class="muted">${t("status.owned", { n: formatNumber(owned) })}</div>
                ${unlocked ? `<div class="settings-row"><button class="small shiny-button" data-pin-egg="${variant.id}" data-pin-shiny="true" ${owned > 0 ? "" : "disabled"}>${t("status.pinShiny")}</button></div>` : ""}
              </div>
            `;
        }).join("");
        return `
            <div class="codex-rarity-group">
              <div class="codex-rarity-header" style="color:${r.color}">${t("codex.shinyGroup", { name: tRarity(r.name) })}</div>
              ${variantRows}
            </div>
          `;
      }).join("")
    : `<div class="settings-row"><button class="small shiny-button" data-expand-shiny-codex>${t("codex.expandShiny")}</button></div>`;

  runtime.el.eggCodex.innerHTML = `
      ${rollableFound === 0 && fusionFound === 0 ? `<div class="empty-state muted">${t("codex.empty")}</div>` : ""}
      ${rows.join("")}
      ${fusionSection}
      <div class="codex-rarity-group shiny-codex-section">
        <div class="codex-rarity-header">${t("codex.shinyTitle")} (${t("codex.shinyProgress", { found: formatNumber(shinyDiscovered), total: formatNumber(shinyTotal) })})</div>
        <div class="progress-bar"><div class="progress-fill shiny-progress" style="width:${shinyTotal > 0 ? (shinyDiscovered / shinyTotal) * 100 : 0}%"></div></div>
      </div>
      ${shinyRows}
    `;
  const pct = total > 0 ? (discovered / total) * 100 : 0;
  runtime.el.codexProgress.style.width = `${pct}%`;
  runtime.el.codexProgressText.textContent = `${formatNumber(discovered)} / ${formatNumber(total)} (${t("codex.rollableProgress", { found: formatNumber(rollableFound), total: formatNumber(EGG_TYPES.length) })}, ${t("codex.fusionProgress", { found: formatNumber(fusionFound), total: formatNumber(FUSION_EGG_TYPES.length) })})`;
}

export function renderMuseumShowcase() {
  if (!runtime.el.museumShowcase) return;
  const items = runtime.state.showcase || [];
  const cards = Array.from({ length: SHOWCASE_SLOT_COUNT }).map((_, index) => {
    const item = items[index];
    const egg = item ? ALL_EGG_BY_ID[item.eggId] : null;
    if (!egg) {
      return `<div class="showcase-slot empty">${t("museum.slot", { n: index + 1 })}<span class="muted">${t("museum.pinHint")}</span></div>`;
    }
    return `
        <div class="showcase-slot ${item.shiny ? "shiny-entry" : ""}">
          <div class="codex-title">
            <strong style="color:${egg.color}">${item.shiny ? `${t("status.shiny")} ` : ""}${escapeHtml(egg.name)}</strong>
            <button class="small danger" data-remove-showcase="${index}">${t("museum.remove")}</button>
          </div>
          <div class="muted">${t("museum.showcasePick", { rarity: tRarity(egg.rarity) })}</div>
        </div>
      `;
  }).join("");
  runtime.el.museumShowcase.innerHTML = cards;
  runtime.el.museumShowcase.querySelectorAll("button[data-remove-showcase]").forEach((button) => {
    button.addEventListener("click", () => {
      runtime.state.showcase.splice(Number(button.getAttribute("data-remove-showcase")), 1);
      renderMuseumShowcase();
    });
  });
}

export function pinShowcaseEgg(eggId, shiny) {
  if (!runtime.state || !eggId) return;
  const egg = ALL_EGG_BY_ID[eggId];
  if (!egg) return;
  if (shiny && Number(runtime.state.shinyCollection[eggId] || 0) <= 0) return;
  const item = { eggId, shiny: !!shiny };
  runtime.state.showcase = (runtime.state.showcase || []).filter((existing) => {
    return existing.eggId !== item.eggId || !!existing.shiny !== item.shiny;
  });
  runtime.state.showcase.unshift(item);
  runtime.state.showcase = runtime.state.showcase.slice(0, SHOWCASE_SLOT_COUNT);
  renderMuseumShowcase();
}

export function renderEventLog() {
  const rows = (runtime.state?.eventLog || []).map((eventItem) => {
    return `
        <div class="event-item">
          <div>${escapeHtml(eventItem.message)}</div>
          <small>${new Date(eventItem.at).toLocaleTimeString()}</small>
        </div>
      `;
  });
  runtime.el.eventLog.innerHTML = rows.join("") || `<div class="muted">${t("status.noEvents")}</div>`;
}

export function renderSetBonuses() {
  const html = RARITIES.map((rarity) => {
    const variants = EGG_VARIANTS[rarity.name] || [];
    const discovered = variants.filter((variant) => Number(runtime.state.eggCollection[variant.id] || 0) > 0).length;
    const complete = !!runtime.state.completedSets[rarity.name];
    const bonus = SET_BONUS_CONFIG[rarity.name];
    return `
        <div class="set-item ${complete ? "done" : ""}">
          <div class="codex-title">
            <strong style="color:${rarity.color}">${t("set.setName", { name: tRarity(rarity.name) })}</strong>
            <span class="codex-status">${complete ? t("status.active") : `${discovered}/${variants.length}`}</span>
          </div>
          <div class="muted" data-tip="${escapeHtml(bonus ? tSetBonusLabel(rarity.name, bonus.label) : t("status.noBonus"))}">${bonus ? tSetBonusLabel(rarity.name, bonus.label) : t("status.noBonus")}</div>
        </div>
      `;
  }).join("");
  runtime.el.setBonuses.innerHTML = html;
}

export function renderCompanions() {
  const html = COMPANION_VARIANTS.map((companion) => {
    const ownedEggs = Number(runtime.state.eggCollection[companion.id] || 0);
    const hatched = Number(runtime.state.hatchedCompanions[companion.id] || 0) > 0;
    const canHatch = ownedEggs > 0 && runtime.state.gems >= companion.hatchCost && !hatched;
    const isActive = runtime.state.activeCompanionId === companion.id;
    return `
        <div class="companion-item">
          <div class="codex-title">
            <strong>${companion.name}</strong>
            <span class="codex-status">${isActive ? t("status.active") : hatched ? t("status.hatched") : t("status.locked")}</span>
          </div>
          <div class="muted">${t("companion.line", { rarity: tRarity(companion.rarity), bonus: formatCompanionBonus(companion) })}</div>
          <div class="muted">${t("companion.eggOwned", { n: formatNumber(ownedEggs) })} | ${t("companion.hatchCost", { n: formatNumber(companion.hatchCost) })}</div>
          <div class="settings-row">
            <button data-hatch="${companion.id}" ${canHatch ? "" : "disabled"}>${t("companion.hatch")}</button>
            <button data-activate="${companion.id}" ${hatched ? "" : "disabled"}>${isActive ? t("status.active") : t("status.activate")}</button>
          </div>
        </div>
      `;
  }).join("");
  runtime.el.companionPanel.innerHTML = html;
  runtime.el.companionPanel.querySelectorAll("button[data-hatch]").forEach((btn) => {
    btn.addEventListener("click", () => hatchCompanion(btn.getAttribute("data-hatch")));
  });
  runtime.el.companionPanel.querySelectorAll("button[data-activate]").forEach((btn) => {
    btn.addEventListener("click", () => activateCompanion(btn.getAttribute("data-activate")));
  });
}

export function renderFusionLab() {
  const tiers = [
    { id: "base", label: t("fusion.tier.base") },
    { id: "advanced", label: t("fusion.tier.advanced") },
    { id: "super", label: t("fusion.tier.super") }
  ];
  const query = runtime.fusionSearchQuery.trim().toLowerCase();
  const filteredRecipes = FUSION_RECIPES.filter((recipe) => {
    const tier = getFusionRecipeTier(recipe);
    if (runtime.fusionTierFilter !== "all" && tier !== runtime.fusionTierFilter) return false;
    if (!query) return true;
    return getFusionRecipeSearchText(recipe).includes(query);
  });

  const grouped = tiers.map((tierInfo) => {
    const recipesInTier = filteredRecipes.filter((recipe) => getFusionRecipeTier(recipe) === tierInfo.id);
    if (!recipesInTier.length) return "";
    const cards = recipesInTier.map((recipe) => {
      const resultEgg = FUSION_EGG_BY_ID[recipe.resultId];
      const canCraft = canCraftFusionRecipe(recipe);
      const ingredientsText = recipe.ingredients
        .map((ingredient) => {
          const egg = ALL_EGG_BY_ID[ingredient.eggId];
          const owned = Number(runtime.state.eggCollection[ingredient.eggId] || 0);
          const ok = owned >= ingredient.count;
          return `<span style="color:${ok ? "var(--success)" : "var(--muted)"}">${ingredient.count}x ${escapeHtml(egg?.name || ingredient.eggId)} (${owned})</span>`;
        })
        .join(" • ");

      return `
          <div class="fusion-item ${runtime.fusionSelectedRecipeId === recipe.id ? "done" : ""}">
            <div class="codex-title">
              <strong>${escapeHtml(recipe.name)}</strong>
              <span class="codex-status">${canCraft ? t("status.ready") : t("status.missing")}</span>
            </div>
            <div class="muted">${t("fusion.crafts")} <span style="color:${resultEgg?.color || "var(--text)"}">${escapeHtml(resultEgg?.name || recipe.resultId)}</span></div>
            <div class="muted">${ingredientsText}</div>
            <div class="settings-row">
              <button data-fuse="${recipe.id}" ${canCraft ? "" : "disabled"}>${t("fusion.fuse")}</button>
              <button data-track-fusion="${recipe.id}">${t("fusion.track")}</button>
            </div>
          </div>
        `;
    }).join("");

    return `
        <div class="fusion-group">
          <h4>${tierInfo.label}</h4>
          <div class="fusion-list">${cards}</div>
        </div>
      `;
  }).join("");

  const chainHtml = renderFusionChainsVisualizer();
  const autoUnlocked = hasAutoFusionUnlock(runtime.state);
  const autoEnabled = !!runtime.state.settings.autoFusionEnabled;
  runtime.el.fusionLab.innerHTML = `
      <div class="fusion-auto-panel ${autoUnlocked ? "" : "locked"}">
        <label class="filter-check fusion-auto-toggle">
          <input id="auto-fusion-toggle" type="checkbox" ${autoEnabled ? "checked" : ""} ${autoUnlocked ? "" : "disabled"} />
          <span>${t("fusion.autoToggle")}</span>
        </label>
        <p class="muted section-hint">${autoUnlocked ? t("fusion.autoHint") : t("fusion.autoLocked")}</p>
        <div id="auto-fusion-status" class="muted">${escapeHtml(getAutoFusionStatusText())}</div>
      </div>
      <div class="fusion-toolbar">
        <input id="fusion-search-input" placeholder="${t("fusion.searchPh")}" value="${escapeHtml(runtime.fusionSearchQuery)}" />
        <select id="fusion-tier-filter">
          <option value="all" ${runtime.fusionTierFilter === "all" ? "selected" : ""}>${t("fusion.allTiers")}</option>
          <option value="base" ${runtime.fusionTierFilter === "base" ? "selected" : ""}>${t("fusion.tier.base")}</option>
          <option value="advanced" ${runtime.fusionTierFilter === "advanced" ? "selected" : ""}>${t("fusion.tier.advanced")}</option>
          <option value="super" ${runtime.fusionTierFilter === "super" ? "selected" : ""}>${t("fusion.tier.super")}</option>
        </select>
        <div class="muted">${t("fusion.showing", { shown: filteredRecipes.length, total: FUSION_RECIPES.length })}</div>
      </div>
      ${grouped || `<div class="muted">${t("fusion.noMatch")}</div>`}
      <div class="fusion-chain-panel">
        <h4>${t("fusion.chainsTitle")}</h4>
        ${chainHtml}
      </div>
    `;

  const searchInput = runtime.el.fusionLab.querySelector("#fusion-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      runtime.fusionSearchQuery = String(event.target?.value || "");
      renderFusionLab();
    });
  }

  const tierFilter = runtime.el.fusionLab.querySelector("#fusion-tier-filter");
  if (tierFilter) {
    tierFilter.addEventListener("change", (event) => {
      runtime.fusionTierFilter = String(event.target?.value || "all");
      renderFusionLab();
    });
  }

  runtime.el.fusionLab.querySelectorAll("button[data-fuse]").forEach((btn) => {
    btn.addEventListener("click", () => {
      craftFusion(btn.getAttribute("data-fuse"));
      renderFusionLab();
    });
  });
  const autoToggle = runtime.el.fusionLab.querySelector("#auto-fusion-toggle");
  if (autoToggle) {
    autoToggle.addEventListener("change", () => {
      if (!runtime.state || !hasAutoFusionUnlock(runtime.state)) return;
      runtime.state.settings.autoFusionEnabled = !!autoToggle.checked;
      runtime.fusionBuffer = 0;
      save();
      renderFusionLab();
    });
  }
  runtime.el.fusionLab.querySelectorAll("button[data-track-fusion]").forEach((btn) => {
    btn.addEventListener("click", () => {
      runtime.fusionSelectedRecipeId = btn.getAttribute("data-track-fusion");
      renderFusionLab();
    });
  });
}

export function renderAscension() {
  runtime.el.ascLevel.textContent = formatNumber(runtime.state.ascensionLevel);
  runtime.el.ascPoints.textContent = formatNumber(runtime.state.ascensionPoints);
  const minPrestige = ASCENSION_CONFIG.minPrestige;
  const prestige = runtime.state.prestigeLevel;
  const canAscend = prestige >= minPrestige;
  runtime.el.ascendBtn.disabled = !canAscend;
  if (runtime.el.ascensionRequirements) {
    const apGain = Math.max(ASCENSION_CONFIG.baseGain, Math.floor(prestige / minPrestige));
    runtime.el.ascensionRequirements.innerHTML = `
      <div class="asc-req-block ${canAscend ? "met" : "unmet"}">
        <strong>${t("asc.reqTitle")}</strong>
        <p>${t("asc.reqPrestige", { current: formatNumber(prestige), required: formatNumber(minPrestige) })}</p>
        <p class="muted">${canAscend ? t("asc.reqMet") : t("asc.reqUnmet", { n: minPrestige })}</p>
        <p class="muted">${t("asc.rewardPreview", { n: canAscend ? apGain : Math.max(1, Math.floor(minPrestige / minPrestige)) })}</p>
      </div>
      <div class="asc-req-columns">
        <div><strong>${t("asc.resetsTitle")}</strong><ul class="asc-list">
          <li>${t("asc.resetCoins")}</li><li>${t("asc.resetEggs")}</li><li>${t("asc.resetShops")}</li>
          <li>${t("asc.resetCompanions")}</li><li>${t("asc.resetPrestige")}</li>
        </ul></div>
        <div><strong>${t("asc.keepsTitle")}</strong><ul class="asc-list">
          <li>${t("asc.keepAsc")}</li><li>${t("asc.keepDice")}</li><li>${t("asc.keepCodex")}</li>
        </ul></div>
      </div>`;
  }

  const purchases = Number(runtime.state.dicePurchases || 0);
  const currentDice = getDiceInfo(runtime.state);
  const nextDice = getNextDiceUpgrade(runtime.state);
  const diceHtml = nextDice
    ? `
        <div class="shop-item">
          <div class="shop-item-top">
            <strong>${t("asc.diceUpgrade")}</strong>
            <span>${purchases}/${MAX_DICE_PURCHASES}</span>
          </div>
          <div class="muted">${t("asc.upgradeLine", { cur: currentDice.name, curLabel: currentDice.label, next: nextDice.name, nextLabel: nextDice.label })}</div>
          <div class="muted">${t("asc.costAp", { cost: DICE_AP_COST, sides: nextDice.sides })}</div>
          <button data-buy-dice ${runtime.state.ascensionPoints >= DICE_AP_COST ? "" : "disabled"}>${t("asc.buyDie")}</button>
        </div>
      `
    : `
        <div class="shop-item">
          <div class="shop-item-top">
            <strong>${t("asc.diceUpgrade")}</strong>
            <span>${MAX_DICE_PURCHASES}/${MAX_DICE_PURCHASES}</span>
          </div>
          <div class="muted">${t("asc.maxed", { name: currentDice.name, label: currentDice.label, sides: currentDice.sides })}</div>
        </div>
      `;

  const html = diceHtml + ASCENSION_CONFIG.upgrades.map((upgrade) => {
    const level = Number(runtime.state.ascensionUpgrades[upgrade.id] || 0);
    const maxed = upgrade.maxLevel && level >= upgrade.maxLevel;
    const cost = maxed ? 0 : Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, level));
    const canBuy = !maxed && runtime.state.ascensionPoints >= cost;
    const levelLabel = upgrade.maxLevel === 1
      ? (maxed ? t("status.maxed") : t("status.lv", { n: level }))
      : `${t("status.lv", { n: level })}${upgrade.maxLevel ? ` / ${upgrade.maxLevel}` : ""}`;
    return `
        <div class="shop-item">
          <div class="shop-item-top">
            <strong>${escapeHtml(upgrade.name)}</strong>
            <span>${levelLabel}</span>
          </div>
          <div class="muted">${getAscensionUpgradeEffectText(upgrade)}</div>
          <div class="muted">${maxed ? "" : t("asc.costApOnly", { cost })}</div>
          <button data-asc-buy="${upgrade.id}" ${canBuy ? "" : "disabled"}>${maxed ? t("status.maxed") : t("status.buyPlain")}</button>
        </div>
      `;
  }).join("");
  runtime.el.ascUpgrades.innerHTML = html;
  const buyDiceBtn = runtime.el.ascUpgrades.querySelector("button[data-buy-dice]");
  if (buyDiceBtn) {
    buyDiceBtn.addEventListener("click", () => {
      buyDiceUpgrade();
      renderCore();
      renderAscension();
    });
  }
  runtime.el.ascUpgrades.querySelectorAll("button[data-asc-buy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      buyAscensionUpgrade(btn.getAttribute("data-asc-buy"));
      renderAscension();
      renderFusionLab();
    });
  });
}

function updateAutoFusionStatus() {
  const el = document.getElementById("auto-fusion-status");
  if (el && runtime.state) {
    el.textContent = getAutoFusionStatusText();
  }
}

export function tickIncubatorTimers() {
  if (!runtime.state || runtime.activeTab !== "progression" || !runtime.el.incubatorPanel) return;
  const slots = runtime.el.incubatorPanel.querySelectorAll(".incubator-slot");
  if (!slots.length) return;
  sanitizeIncubator();
  slots.forEach((el, index) => {
    const slot = runtime.state.incubator[index];
    if (!slot) return;
    const progress = getIncubatorProgress(slot);
    const ready = progress >= 1;
    const remaining = Math.max(0, Number(slot.durationMs || 0) - (Date.now() - Number(slot.startedAt || 0)));
    const fill = el.querySelector(".progress-fill");
    const badge = el.querySelector(".status-badge");
    const btn = el.querySelector("[data-claim-incubator]");
    if (fill) {
      fill.style.width = `${Math.round(progress * 100)}%`;
      fill.classList.toggle("complete", ready);
    }
    if (badge) {
      badge.textContent = ready ? t("incubator.ready") : formatDuration(remaining);
      badge.classList.toggle("ready", ready);
    }
    el.classList.toggle("ready", ready);
    el.classList.toggle("ready-glow", ready);
    if (btn) {
      btn.disabled = !ready;
      btn.classList.toggle("ghost", !ready);
    }
  });
}

export function renderIncubator() {
  if (!runtime.state || !runtime.el.incubatorPanel) return;
  sanitizeIncubator();
  const maxSlots = getIncubatorMaxSlots();
  const ownedEggs = EGG_TYPES.filter((egg) => Number(runtime.state.eggCollection[egg.id] || 0) > 0);
  const slotHtml = runtime.state.incubator.map((slot, index) => {
    const egg = ALL_EGG_BY_ID[slot.eggId];
    if (!egg) return "";
    const progress = getIncubatorProgress(slot);
    const ready = progress >= 1;
    const remaining = Math.max(0, Number(slot.durationMs || 0) - (Date.now() - Number(slot.startedAt || 0)));
    return `
      <div class="shop-item incubator-slot${ready ? " ready" : ""}">
        <div class="shop-item-top">
          <strong><span class="egg-dot" style="background:${egg.color || "var(--primary)"}"></span>${escapeHtml(egg.name)}</strong>
          <span class="status-badge${ready ? " ready" : ""}">${ready ? t("incubator.ready") : formatDuration(remaining)}</span>
        </div>
        <div class="progress-bar incubator-progress"><div class="progress-fill${ready ? " complete" : ""}" style="width:${Math.round(progress * 100)}%"></div></div>
        <button type="button" class="${ready ? "" : "ghost"}" data-claim-incubator="${index}" ${ready ? "" : "disabled"}>${t("incubator.claim")}</button>
      </div>`;
  }).join("");
  const emptySlots = Math.max(0, maxSlots - runtime.state.incubator.length);
  const emptyHtml = emptySlots > 0
    ? `<div class="muted">${t("incubator.slotsFree", { n: emptySlots })}</div>`
    : "";
  const eggOptions = ownedEggs.map((egg) =>
    `<option value="${egg.id}">${escapeHtml(egg.name)} (${formatNumber(runtime.state.eggCollection[egg.id])})</option>`
  ).join("");
  runtime.el.incubatorPanel.innerHTML = `
    <div class="panel-stat">${t("incubator.slots", { used: runtime.state.incubator.length, max: maxSlots })}</div>
    ${slotHtml || `<div class="empty-state">${t("incubator.empty")}</div>`}
    ${emptyHtml}
    <div class="settings-row incubator-start-row">
      <select id="incubator-egg-select" class="panel-select" ${ownedEggs.length && emptySlots ? "" : "disabled"}>
        <option value="">${t("incubator.selectEgg")}</option>
        ${eggOptions}
      </select>
      <button type="button" id="incubator-start-btn" ${ownedEggs.length && emptySlots ? "" : "disabled"}>${t("incubator.start")}</button>
    </div>`;
  runtime.el.incubatorPanel.querySelectorAll("button[data-claim-incubator]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slot = btn.closest(".incubator-slot");
      claimIncubatorSlot(Number(btn.getAttribute("data-claim-incubator")));
      if (slot) replayClass(slot, "hatch-burst");
      renderIncubator();
      renderCore();
    });
  });
  document.getElementById("incubator-start-btn")?.addEventListener("click", () => {
    const eggId = document.getElementById("incubator-egg-select")?.value;
    if (!eggId) return;
    if (startIncubating(eggId)) {
      renderIncubator();
      renderCore();
    }
  });
}

export function renderRelics() {
  if (!runtime.state || !runtime.el.relicsPanel) return;
  const maxSlots = getRelicMaxSlots();
  const equipped = runtime.state.relicsEquipped || [];
  const html = RELIC_DEFS.map((relic) => {
    const unlocked = isRelicUnlocked(relic.id);
    const isEquipped = equipped.includes(relic.id);
    const buffPct = Math.round(Number(relic.buffValue || 0) * 100);
    return `
      <div class="shop-item relic-item${unlocked ? (isEquipped ? " equipped" : " unlocked") : " locked"}">
        <div class="shop-item-top">
          <strong>${escapeHtml(relic.name)}</strong>
          <span class="status-badge${isEquipped ? " equipped" : unlocked ? " unlocked" : " locked"}">${unlocked ? (isEquipped ? t("relics.equipped") : t("relics.unlocked")) : t("relics.locked")}</span>
        </div>
        <div class="muted relic-buff">${t("relics.buff", { type: relic.buffType, n: buffPct })}</div>
        <div class="muted">${unlocked ? "" : t("relics.req", { req: formatRelicUnlockText(relic) })}</div>
        ${unlocked ? `<button type="button" class="${isEquipped ? "ghost" : ""}" data-equip-relic="${relic.id}">${isEquipped ? t("relics.unequip") : t("relics.equip")}</button>` : ""}
      </div>`;
  }).join("");
  runtime.el.relicsPanel.innerHTML = `
    <div class="panel-stat">${t("relics.slots", { used: equipped.length, max: maxSlots })}</div>
    <div class="relics-grid">${html}</div>`;
  runtime.el.relicsPanel.querySelectorAll("button[data-equip-relic]").forEach((btn) => {
    btn.addEventListener("click", () => {
      equipRelic(btn.getAttribute("data-equip-relic"));
      replayClass(btn.closest(".relic-item"), "equip-flash");
      renderRelics();
      renderCore();
    });
  });
}

export function renderPrestigeShop() {
  if (!runtime.state || !runtime.el.prestigeShopList) return;
  const pp = Number(runtime.state.prestigePoints || 0);
  if (runtime.el.prestigePointsDisplay) {
    runtime.el.prestigePointsDisplay.textContent = formatNumber(pp);
  }
  const html = PRESTIGE_SHOP_ITEMS.map((item) => {
    const level = Number(runtime.state.prestigeUpgrades[item.id] || 0);
    const maxed = item.maxLevel && level >= item.maxLevel;
    const cost = maxed ? 0 : getUpgradeCost(item, level);
    const canBuy = !maxed && pp >= cost;
    return `
      <div class="shop-item prestige-item">
        <div class="shop-item-top">
          <strong>${escapeHtml(item.name)}</strong>
          <span class="level-badge">${t("status.lv", { n: level })}${item.maxLevel ? ` / ${item.maxLevel}` : ""}</span>
        </div>
        <div class="muted">${getPrestigeShopEffectText(item)}</div>
        <button type="button" data-pp-buy="${item.id}" ${canBuy ? "" : "disabled"}>${maxed ? t("status.maxed") : t("status.buyPp", { cost: formatNumber(cost) })}</button>
      </div>`;
  }).join("");
  runtime.el.prestigeShopList.innerHTML = html;
  runtime.el.prestigeShopList.querySelectorAll("button[data-pp-buy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      buyPrestigeUpgrade(btn.getAttribute("data-pp-buy"));
      renderPrestigeShop();
      renderIncubator();
      renderRelics();
      renderCore();
    });
  });
}

export function renderGlobalEvent() {
  if (!runtime.state) {
    runtime.el.globalEventBanner.textContent = t("social.noEvent");
    return;
  }
  const eventData = getCurrentGlobalEvent();
  if (!eventData) {
    runtime.el.globalEventBanner.textContent = t("social.noEvent");
    return;
  }
  runtime.el.globalEventBanner.textContent = t("social.eventActive", { label: tEventLabel(eventData.id, eventData.label) });
}

export function renderShop() {
  const search = runtime.state?.settings?.filters?.shopSearch || "";
  const itemsHtml = SHOP_ITEMS.filter((item) => matchesQuery(tShopName(item.id, item.name), search)).map((item) => {
    const level = runtime.state ? runtime.state.upgrades[item.id] || 0 : 0;
    const cost = getUpgradeCost(item, level);
    const affordable = runtime.state ? runtime.state.coins >= cost : false;
    const effectText = getCoinShopEffectText(item);

    return `
        <div class="shop-item">
          <div class="shop-item-top">
            <strong>${tShopName(item.id, item.name)}</strong>
            <span>${t("status.lv", { n: level })}</span>
          </div>
          <div class="muted">${effectText}</div>
          <button data-buy="${item.id}" ${affordable ? "" : "disabled"}>${t("status.buy", { cost: formatNumber(cost) })}</button>
        </div>
      `;
  }).join("");

  runtime.el.shopList.innerHTML = itemsHtml;
  runtime.el.shopList.querySelectorAll("button[data-buy]").forEach((button) => {
    button.addEventListener("click", () => {
      buyUpgrade(button.getAttribute("data-buy"));
    });
  });
}

export function renderDiceShop() {
  if (!runtime.el.diceShopList || !runtime.state) return;
  const owned = hasSecondDie(runtime.state);
  const die = getSecondDieInfo(runtime.state);
  const affordableUnlock = runtime.state.gems >= SECOND_DIE_GEM_COST;

  const unlockHtml = owned
    ? ""
    : `
    <div class="shop-item gem-item">
      <div class="shop-item-top">
        <strong>${t("shops.secondDieName", { name: die.name })}</strong>
        <span>${t("shops.secondDieLocked")}</span>
      </div>
      <div class="muted">${t("shops.secondDieDesc", { label: die.label, sides: die.sides, rps: formatNumber(SECOND_DIE_BASE_RPS) })}</div>
      <button data-buy-second-die ${!affordableUnlock ? "disabled" : ""}>${t("status.buyGems", { cost: formatNumber(SECOND_DIE_GEM_COST) })}</button>
    </div>`;

  let tierHtml = "";
  if (owned) {
    const purchases = getSecondDiePurchases(runtime.state);
    const next = getNextSecondDieUpgrade(runtime.state);
    if (next) {
      const cost = SECOND_DIE_TIER_UPGRADE_COSTS[purchases];
      tierHtml = `
        <div class="shop-item gem-item">
          <div class="shop-item-top">
            <strong>${t("shops.secondDieTier")}</strong>
            <span>${purchases}/${MAX_SECOND_DIE_PURCHASES}</span>
          </div>
          <div class="muted">${t("shops.secondDieTierLine", { cur: die.name, curLabel: die.label, next: next.name, nextLabel: next.label })}</div>
          <button data-buy-second-die-tier ${runtime.state.gems < cost ? "disabled" : ""}>${t("status.buyGems", { cost: formatNumber(cost) })}</button>
        </div>`;
    } else {
      tierHtml = `
        <div class="shop-item gem-item">
          <div class="shop-item-top">
            <strong>${t("shops.secondDieTier")}</strong>
            <span>${MAX_SECOND_DIE_PURCHASES}/${MAX_SECOND_DIE_PURCHASES}</span>
          </div>
          <div class="muted">${t("shops.secondDieMaxed", { name: die.name, label: die.label, sides: die.sides })}</div>
        </div>`;
    }
  }

  const rpsHtml = owned
    ? SECOND_DIE_RPS_ITEMS.map((item) => {
        const level = Number(runtime.state.secondDieUpgrades?.[item.id] || 0);
        const cost = getUpgradeCost(item, level);
        const affordable = runtime.state.gems >= cost;
        return `
          <div class="shop-item gem-item">
            <div class="shop-item-top">
              <strong>${item.name}</strong>
              <span>${t("status.lv", { n: level })}</span>
            </div>
            <div class="muted">${getSecondDieRpsEffectText(item)}</div>
            <button data-buy-second-die-rps="${item.id}" ${affordable ? "" : "disabled"}>${t("status.buyGems", { cost: formatNumber(cost) })}</button>
          </div>`;
      }).join("")
    : "";

  runtime.el.diceShopList.innerHTML = unlockHtml + tierHtml + rpsHtml;
}

export function renderGemShop() {
  const search = runtime.state?.settings?.filters?.gemShopSearch || "";
  const itemsHtml = GEM_SHOP_ITEMS.filter((item) => matchesQuery(tGemShopName(item.id, item.name), search)).map((item) => {
    const level = runtime.state ? runtime.state.gemUpgrades[item.id] || 0 : 0;
    const cost = getUpgradeCost(item, level);
    const affordable = runtime.state ? runtime.state.gems >= cost : false;
    const effectText = getGemShopEffectText(item);

    return `
        <div class="shop-item gem-item">
          <div class="shop-item-top">
            <strong>${tGemShopName(item.id, item.name)}</strong>
            <span>${t("status.lv", { n: level })}</span>
          </div>
          <div class="muted">${effectText}</div>
          <button data-gem-buy="${item.id}" ${affordable ? "" : "disabled"}>${t("status.buyGems", { cost: formatNumber(cost) })}</button>
        </div>
      `;
  }).join("");

  runtime.el.gemShopList.innerHTML = itemsHtml;
  runtime.el.gemShopList.querySelectorAll("button[data-gem-buy]").forEach((button) => {
    button.addEventListener("click", () => {
      buyGemUpgrade(button.getAttribute("data-gem-buy"));
    });
  });
}

export function renderStats() {
  if (!runtime.state) return;
  if (runtime.el.statRolls) runtime.el.statRolls.textContent = formatNumber(runtime.state.totalRolls);
  if (runtime.el.statCoins) runtime.el.statCoins.textContent = formatNumber(Math.floor(runtime.state.totalCoinsEarned));
  if (runtime.el.statGems) runtime.el.statGems.textContent = formatNumber(Math.floor(runtime.state.totalGemsEarned));
  if (runtime.el.statRarest) runtime.el.statRarest.textContent = runtime.state.rarestEgg || t("status.none");
  if (runtime.el.statTime) runtime.el.statTime.textContent = formatDuration(runtime.state.playtimeMs);
  if (runtime.el.statRps) {
    const total = getPrimaryRPS() + getSecondDieRPS();
    runtime.el.statRps.textContent = total.toFixed(2);
  }
  if (runtime.el.statPrestige) runtime.el.statPrestige.textContent = String(runtime.state.prestigeLevel);
  const stats = runtime.state.stats || {};
  if (runtime.el.statShinies) runtime.el.statShinies.textContent = formatNumber(Object.values(runtime.state.shinyCollection || {}).reduce((sum, count) => sum + Number(count || 0), 0));
  if (runtime.el.statDryEgg) runtime.el.statDryEgg.textContent = formatNumber(stats.rollsSinceLastEgg || 0);
  if (runtime.el.statDryRare) runtime.el.statDryRare.textContent = formatNumber(stats.rollsSinceLastRarePlus || 0);
  if (runtime.el.statJackpots) runtime.el.statJackpots.textContent = formatNumber(stats.jackpotsHit || 0);
  if (runtime.el.statTitle) runtime.el.statTitle.textContent = tTitleLabel(runtime.state.activeTitle, getTitleLabel(runtime.state.activeTitle));

  const progressPercent = Math.min(100, (runtime.state.rollsSincePrestige / PRESTIGE_TARGET_ROLLS) * 100);
  if (runtime.el.prestigeProgress) runtime.el.prestigeProgress.style.width = `${progressPercent}%`;
  const prestigeWrap = runtime.el.prestigeProgress?.closest(".progress-wrap");
  if (prestigeWrap) prestigeWrap.classList.toggle("prestige-near", progressPercent >= 85);
  if (runtime.el.prestigeProgressText) {
    runtime.el.prestigeProgressText.textContent = t("roll.prestigeRolls", {
      current: formatNumber(runtime.state.rollsSincePrestige),
      target: formatNumber(PRESTIGE_TARGET_ROLLS)
    });
  }
}

export function renderAchievements() {
  const html = ACHIEVEMENTS.map((a) => {
    const done = !!(runtime.state && runtime.state.achievementsUnlocked[a.id]);
    return `
        <div class="achievement-item ${done ? "done" : ""}">
          <div><strong>${tAchievement(a.id, a.title)}</strong></div>
          <div class="muted">${done ? t("achievement.unlocked") : t("achievement.locked")} - ${t("status.rewardGems", { n: a.rewardGems })}</div>
        </div>
      `;
  }).join("");
  runtime.el.achievements.innerHTML = html;
}

export function updateDailyUI() {
  if (!runtime.state || !runtime.el.dailyBtn) {
    if (runtime.el?.dailyText) runtime.el.dailyText.textContent = "";
    return;
  }
  const now = Date.now();
  const nextAt = runtime.state.daily.lastClaimAt + DAILY_REWARD_COOLDOWN_MS;
  if (runtime.state.daily.lastClaimAt === 0 || now >= nextAt) {
    runtime.el.dailyBtn.disabled = false;
    runtime.el.dailyText.textContent = t("settings.dailyReadyMsg");
    runtime.el.dailyProgress.style.width = "100%";
    runtime.el.dailyProgressText.textContent = t("settings.dailyReady");
    return;
  }

  const remaining = nextAt - now;
  const passed = DAILY_REWARD_COOLDOWN_MS - remaining;
  const pct = Math.max(0, Math.min(100, (passed / DAILY_REWARD_COOLDOWN_MS) * 100));
  runtime.el.dailyBtn.disabled = true;
  runtime.el.dailyText.textContent = t("settings.dailyRemain", { time: formatDuration(remaining) });
  runtime.el.dailyProgress.style.width = `${pct}%`;
  runtime.el.dailyProgressText.textContent = t("settings.dailyLeft", { time: formatDuration(remaining) });
}

export function renderThemeShop() {
  if (!runtime.state || !runtime.el.themeShopList) return;
  const active = runtime.state.settings.activeTheme || "classic";
  runtime.el.themeShopList.innerHTML = THEME_SHOP.map((theme) => {
    const unlocked = isThemeUnlocked(runtime.state, theme.id);
    const equipped = active === theme.id;
    const canAfford = runtime.state.gems >= theme.cost;
    let actionLabel = t("status.equip");
    let actionClass = "secondary";
    if (!unlocked && theme.cost > 0) {
      actionLabel = t("status.unlockGems", { cost: formatNumber(theme.cost) });
      actionClass = canAfford ? "primary" : "ghost";
    } else if (equipped) {
      actionLabel = t("status.equipped");
      actionClass = "ghost";
    }
    return `
      <div class="theme-card ${equipped ? "equipped" : ""} ${unlocked ? "unlocked" : "locked"}">
        <div class="theme-swatch" style="background:${theme.swatch}"></div>
        <div class="theme-info">
          <strong>${escapeHtml(tThemeName(theme.id, theme.name))}</strong>
          <span class="muted">${escapeHtml(tThemeDesc(theme.id, theme.desc))}</span>
          ${!unlocked && theme.cost > 0 ? `<span class="theme-cost">${t("theme.gemsCost", { n: formatNumber(theme.cost) })}</span>` : ""}
        </div>
        <button type="button" class="small ${actionClass}" data-theme-action="${theme.id}" ${equipped ? "disabled" : ""}>
          ${actionLabel}
        </button>
      </div>`;
  }).join("");
}

export function renderPrestigeMilestones() {
  if (!runtime.state || !runtime.el.prestigeMilestones) return;
  const claimed = runtime.state.prestigeMilestonesClaimed || [];
  const next = PRESTIGE_MILESTONES.find((m) => !claimed.includes(m.id));
  const items = PRESTIGE_MILESTONES.map((m) => {
    const done = claimed.includes(m.id) || runtime.state.prestigeLevel >= m.level;
    const got = claimed.includes(m.id);
    return `<div class="milestone-item ${got ? "done" : done ? "ready" : ""}" data-tip="${escapeHtml(m.label)}">
      <span>Prestige ${m.level}</span>
      <span class="muted">${got ? t("milestone.claimed") : m.label}</span>
    </div>`;
  }).join("");
  runtime.el.prestigeMilestones.innerHTML = `
    <h4>${t("milestone.title")}</h4>
    ${next ? `<p class="muted">${t("milestone.next", { n: next.level, reward: next.label })}</p>` : ""}
    <div class="milestone-track">${items}</div>`;
}

export function renderWeeklyChallenges() {
  if (!runtime.state || !runtime.el.weeklyChallenges) return;
  ensureWeeklyChallenges();
  const html = WEEKLY_CHALLENGE_TEMPLATES.map((tpl) => {
    const task = runtime.state.weeklyChallenges.tasks[tpl.id] || { progress: 0, claimed: false };
    const done = task.progress >= tpl.target;
    const btn = task.claimed
      ? `<span class="muted">${t("challenge.done")}</span>`
      : `<button class="small" data-claim-challenge="${tpl.id}" ${done ? "" : "disabled"}>${t("challenge.claim")}</button>`;
    return `<div class="challenge-item ${task.claimed ? "done" : ""}">
      <div class="codex-title"><strong>${t(`challenge.${tpl.id}`)}</strong>
        <span>${t("challenge.progress", { current: formatNumber(task.progress), target: formatNumber(tpl.target) })}</span>
      </div>
      <div class="muted">+${formatNumber(tpl.rewardGems)} gems${tpl.rewardCoins ? `, +${formatNumber(tpl.rewardCoins)} coins` : ""}</div>
      ${btn}
    </div>`;
  }).join("");
  runtime.el.weeklyChallenges.innerHTML = html;
  runtime.el.weeklyChallenges.querySelectorAll("button[data-claim-challenge]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (claimChallenge(btn.getAttribute("data-claim-challenge"))) {
        renderWeeklyChallenges();
        renderCore();
      }
    });
  });
}

export function renderSeasonBanner() {
  if (!runtime.el.seasonBanner) return;
  const season = getActiveSeason();
  if (!season) {
    runtime.el.seasonBanner.textContent = t("season.none");
    return;
  }
  const remaining = getSeasonTimeRemaining();
  runtime.el.seasonBanner.textContent = t("season.active", {
    name: season.name,
    time: formatDuration(remaining)
  });
}

export function populateRarityFilters() {
  const opts = `<option value="all">${t("filter.all")}</option>` +
    RARITIES.map((r) => `<option value="${r.name}">${tRarity(r.name)}</option>`).join("");
  if (runtime.el.collectionRarityFilter) runtime.el.collectionRarityFilter.innerHTML = opts;
  if (runtime.el.codexRarityFilter) runtime.el.codexRarityFilter.innerHTML = opts;
  populatePopupRaritySelect();
}

export function populatePopupRaritySelect() {
  if (!runtime.el.popupRaritySelect) return;
  const off = `<option value="none">${t("settings.popupOff")}</option>`;
  const rarityOpts = RARITIES.map(
    (r) => `<option value="${r.name}">${t("settings.popupAndAbove", { rarity: tRarity(r.name) })}</option>`
  ).join("");
  runtime.el.popupRaritySelect.innerHTML = off + rarityOpts;
  if (runtime.state?.settings?.popupMinRarity) {
    runtime.el.popupRaritySelect.value = runtime.state.settings.popupMinRarity;
  }
}

export function syncFiltersFromUI() {
  if (!runtime.state) return;
  const f = runtime.state.settings.filters;
  if (runtime.el.collectionSearch) f.collectionSearch = runtime.el.collectionSearch.value;
  if (runtime.el.collectionRarityFilter) f.collectionRarity = runtime.el.collectionRarityFilter.value;
  if (runtime.el.collectionOwnedFilter) f.collectionOwned = runtime.el.collectionOwnedFilter.value;
  if (runtime.el.codexSearch) f.codexSearch = runtime.el.codexSearch.value;
  if (runtime.el.codexRarityFilter) f.codexRarity = runtime.el.codexRarityFilter.value;
  if (runtime.el.codexOwnedFilter) f.codexOwned = runtime.el.codexOwnedFilter.value;
  if (runtime.el.codexShinyOnly) f.codexShinyOnly = runtime.el.codexShinyOnly.checked;
  if (runtime.el.shopSearch) f.shopSearch = runtime.el.shopSearch.value;
  if (runtime.el.gemShopSearch) f.gemShopSearch = runtime.el.gemShopSearch.value;
}

export function applyFiltersToUI() {
  if (!runtime.state) return;
  const f = runtime.state.settings.filters;
  if (runtime.el.collectionSearch) runtime.el.collectionSearch.value = f.collectionSearch || "";
  if (runtime.el.collectionRarityFilter) runtime.el.collectionRarityFilter.value = f.collectionRarity || "all";
  if (runtime.el.collectionOwnedFilter) runtime.el.collectionOwnedFilter.value = f.collectionOwned || "all";
  if (runtime.el.codexSearch) runtime.el.codexSearch.value = f.codexSearch || "";
  if (runtime.el.codexRarityFilter) runtime.el.codexRarityFilter.value = f.codexRarity || "all";
  if (runtime.el.codexOwnedFilter) runtime.el.codexOwnedFilter.value = f.codexOwned || "all";
  if (runtime.el.codexShinyOnly) runtime.el.codexShinyOnly.checked = !!f.codexShinyOnly;
  if (runtime.el.shopSearch) runtime.el.shopSearch.value = f.shopSearch || "";
  if (runtime.el.gemShopSearch) runtime.el.gemShopSearch.value = f.gemShopSearch || "";
}
