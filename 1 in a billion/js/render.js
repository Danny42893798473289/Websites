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
  PRESTIGE_TARGET_ROLLS,
  RARITIES,
  SET_BONUS_CONFIG,
  SHOWCASE_SLOT_COUNT,
  SHOP_ITEMS,
  THEME_SHOP,
  getCodexFoundCount,
  getShinyCodexFoundCount,
  getTitleLabel,
  getRarityEggCount
} from "./config.js";
import { runtime } from "./runtime.js";
import { isEggDiscovered, isShinyDiscovered } from "./state.js";
import { escapeHtml, formatDuration, formatNumber } from "./utils.js";
import {
  buyGemUpgrade,
  buyTheme,
  buyUpgrade,
  getCoinShopEffectText,
  getGemShopEffectText,
  getUpgradeCost
} from "./economy.js";
import { getCurrentGlobalEvent } from "./events.js";
import {
  activateCompanion,
  buyAscensionUpgrade,
  buyDiceUpgrade,
  canCraftFusionRecipe,
  craftFusion,
  formatCompanionBonus,
  getFusionRecipeSearchText,
  getFusionRecipeTier,
  hatchCompanion,
  renderFusionChainsVisualizer
} from "./progression.js";
import { getCurrentRPS, getManualStreakBonus } from "./rolling.js";
import { isThemeUnlocked } from "./themes.js";

export function renderCore() {
  if (!runtime.state) return;
  try {
    renderCurrency();
    updateActionPanels();
    renderStats();
    renderGlobalEvent();
    updateDailyUI();
    renderActiveTabLive();
    if (runtime.el.darkModeToggle) {
      runtime.el.darkModeToggle.checked = !!runtime.state.settings.darkMode;
    }
    if (runtime.el.soundToggle) {
      runtime.el.soundToggle.checked = !!runtime.state.settings.soundEnabled;
    }
  } catch (err) {
    console.error("Render core error:", err);
  }
}

function renderActiveTabLive() {
  switch (runtime.activeTab) {
    case "shops":
      renderShop();
      renderGemShop();
      break;
    case "collection":
      renderEggCollection();
      renderMuseumShowcase();
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
      break;
    case "collection":
      renderEggCollection();
      renderMuseumShowcase();
      renderEggCodex();
      break;
    case "shops":
      renderShop();
      renderGemShop();
      break;
    case "progression":
      renderSetBonuses();
      renderCompanions();
      renderFusionLab();
      renderAscension();
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
  runtime.el.rps.textContent = getCurrentRPS().toFixed(2);
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
    const dice = getDiceInfo(runtime.state);
    runtime.el.diceType.textContent = `${dice.label} (1–${dice.sides})`;
  }

  const now = Date.now();
  const ready = now >= runtime.state.luckyRollAvailableAt;
  runtime.el.luckyRollBtn.disabled = !ready || runtime.state.gems < LUCKY_ROLL_COST_GEMS;
  runtime.el.luckyRollTimer.textContent = ready
    ? `Ready${runtime.state.gems < LUCKY_ROLL_COST_GEMS ? " (need gems)" : ""}`
    : `Cooldown: ${formatDuration(runtime.state.luckyRollAvailableAt - now)}`;
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

export function renderEggCollection() {
  const rows = RARITIES.map((r) => {
    const total = runtime.state ? getRarityEggCount(runtime.state, r.name) : 0;
    const variants = (EGG_VARIANTS[r.name] || [])
      .map((variant) => {
        const count = runtime.state ? runtime.state.eggCollection[variant.id] || 0 : 0;
        const shinyCount = runtime.state ? runtime.state.shinyCollection[variant.id] || 0 : 0;
        if (count <= 0 && shinyCount <= 0) return "";
        const sellButton = count > 0 && r.gemValue > 0
          ? `<button class="small" data-sell-egg="${variant.id}">Sell 1</button>`
          : "";
        const shinyButton = shinyCount > 0 && r.gemValue > 0
          ? `<button class="small shiny-button" data-sell-shiny="${variant.id}">Sell Shiny</button>`
          : "";
        return `
            <div class="egg-sub-item">
              <span>${escapeHtml(variant.name)}${shinyCount > 0 ? ` <span class="shiny-pill">Shiny x${formatNumber(shinyCount)}</span>` : ""}</span>
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
              <strong style="color:${r.color}">${r.name}</strong>
              <div class="muted">Odds: 1 in ${formatNumber(r.oneIn)}</div>
            </div>
            <div>${formatNumber(total)}</div>
          </div>
          ${variants || `<div class="egg-sub-item muted">No variants found yet</div>`}
        </div>
      `;
  });
  const fusionRows = FUSION_EGG_TYPES
    .map((egg) => {
      const count = Number(runtime.state.eggCollection[egg.id] || 0);
      if (count <= 0) return "";
      const sellButton = Number(egg.gemValue || 0) > 0 ? `<button class="small" data-sell-egg="${egg.id}">Sell 1</button>` : "";
      return `
          <div class="egg-sub-item">
            <span style="color:${egg.color}">${escapeHtml(egg.name)} [Fusion]</span>
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
            <strong style="color:#a855f7">Fusion Eggs</strong>
            <div class="muted">Crafted in Fusion Lab</div>
          </div>
          <div>${formatNumber(FUSION_EGG_TYPES.reduce((sum, egg) => sum + Number(runtime.state.eggCollection[egg.id] || 0), 0))}</div>
        </div>
        ${fusionRows || `<div class="egg-sub-item muted">No fusion eggs crafted yet</div>`}
      </div>
    `;

  runtime.el.eggLog.innerHTML = rows.join("") + fusionSection;
}

export function renderEggCodex() {
  const discovered = getCodexFoundCount(runtime.state);
  const total = EGG_TYPES.length + FUSION_EGG_TYPES.length;
  const shinyDiscovered = getShinyCodexFoundCount(runtime.state);
  const shinyTotal = EGG_TYPES.length;
  const rows = RARITIES.map((r) => {
    const variantRows = (EGG_VARIANTS[r.name] || [])
      .map((variant) => {
        const owned = runtime.state ? Number(runtime.state.eggCollection[variant.id] || 0) : 0;
        const shinyOwned = runtime.state ? Number(runtime.state.shinyCollection[variant.id] || 0) : 0;
        const unlocked = runtime.state ? isEggDiscovered(runtime.state, variant.id) : false;
        const title = unlocked ? variant.name : "???";
        const description = unlocked ? variant.description : "Roll to discover this egg.";
        const status = unlocked ? (owned > 0 ? "Unlocked" : "Discovered (sold)") : "Locked";
        const titleColor = unlocked ? r.color : "var(--muted)";

        return `
            <div class="codex-item ${unlocked ? "" : "locked"}">
              <div class="codex-title">
                <strong style="color:${titleColor}">${title}</strong>
                <span class="codex-status">${status}</span>
              </div>
              <div class="muted">${description}</div>
              <div class="muted">${unlocked ? `Rarity: ${r.name} (1 in ${formatNumber(r.oneIn)})` : "Rarity: ???"}</div>
              <div class="muted">Owned: ${formatNumber(owned)}${shinyOwned > 0 ? ` | Shinies owned: ${formatNumber(shinyOwned)}` : ""}</div>
              ${unlocked || shinyOwned > 0 ? `<div class="settings-row"><button class="small" data-pin-egg="${variant.id}" data-pin-shiny="false">Pin</button>${shinyOwned > 0 ? `<button class="small shiny-button" data-pin-egg="${variant.id}" data-pin-shiny="true">Pin Shiny</button>` : ""}</div>` : ""}
            </div>
          `;
      })
      .join("");

    return `
        <div class="codex-rarity-group">
          <div class="codex-rarity-header" style="color:${r.color}">${r.name}</div>
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
            <span class="codex-status">${unlocked ? (owned > 0 ? "Unlocked" : "Discovered (sold)") : "Locked"}</span>
          </div>
          <div class="muted">${unlocked ? escapeHtml(egg.description) : "Fuse different eggs to discover this."}</div>
          <div class="muted">${unlocked ? "Rarity: Fusion (Crafted)" : "Rarity: ???"}</div>
          <div class="muted">Owned: ${formatNumber(owned)}</div>
          ${unlocked ? `<div class="settings-row"><button class="small" data-pin-egg="${egg.id}" data-pin-shiny="false">Pin</button></div>` : ""}
        </div>
      `;
  }).join("");

  const fusionSection = `
      <div class="codex-rarity-group">
        <div class="codex-rarity-header" style="color:#a855f7">Fusion</div>
        ${fusionCodexRows}
      </div>
    `;

  const showShinyDetails = !runtime.isMobile || runtime.showShinyCodex;
  const shinyRows = showShinyDetails
    ? RARITIES.map((r) => {
        const variantRows = (EGG_VARIANTS[r.name] || []).map((variant) => {
          const unlocked = isShinyDiscovered(runtime.state, variant.id);
          const owned = Number(runtime.state.shinyCollection[variant.id] || 0);
          return `
              <div class="codex-item ${unlocked ? "shiny-entry" : "locked"}">
                <div class="codex-title">
                  <strong style="color:${unlocked ? r.color : "var(--muted)"}">${unlocked ? `Shiny ${escapeHtml(variant.name)}` : "???"}</strong>
                  <span class="codex-status">${unlocked ? (owned > 0 ? "Shiny Unlocked" : "Shiny Found (sold)") : "Locked"}</span>
                </div>
                <div class="muted">${unlocked ? "A sparkling variant for collectors. Does not count toward set bonuses." : "Find the shiny version of this egg."}</div>
                <div class="muted">Owned: ${formatNumber(owned)}</div>
                ${unlocked ? `<div class="settings-row"><button class="small shiny-button" data-pin-egg="${variant.id}" data-pin-shiny="true" ${owned > 0 ? "" : "disabled"}>Pin Shiny</button></div>` : ""}
              </div>
            `;
        }).join("");
        return `
            <div class="codex-rarity-group">
              <div class="codex-rarity-header" style="color:${r.color}">Shiny ${r.name}</div>
              ${variantRows}
            </div>
          `;
      }).join("")
    : `<div class="settings-row"><button class="small shiny-button" data-expand-shiny-codex>Show Shiny Codex Details</button></div>`;

  runtime.el.eggCodex.innerHTML = `
      ${rows.join("")}
      ${fusionSection}
      <div class="codex-rarity-group shiny-codex-section">
        <div class="codex-rarity-header">Shiny Codex (${formatNumber(shinyDiscovered)} / ${formatNumber(shinyTotal)})</div>
        <div class="progress-bar"><div class="progress-fill shiny-progress" style="width:${shinyTotal > 0 ? (shinyDiscovered / shinyTotal) * 100 : 0}%"></div></div>
      </div>
      ${shinyRows}
    `;
  const pct = total > 0 ? (discovered / total) * 100 : 0;
  runtime.el.codexProgress.style.width = `${pct}%`;
  runtime.el.codexProgressText.textContent = `${formatNumber(discovered)} / ${formatNumber(total)}`;
}

export function renderMuseumShowcase() {
  if (!runtime.el.museumShowcase) return;
  const items = runtime.state.showcase || [];
  const cards = Array.from({ length: SHOWCASE_SLOT_COUNT }).map((_, index) => {
    const item = items[index];
    const egg = item ? ALL_EGG_BY_ID[item.eggId] : null;
    if (!egg) {
      return `<div class="showcase-slot empty">Slot ${index + 1}<span class="muted">Pin an egg from the codex.</span></div>`;
    }
    return `
        <div class="showcase-slot ${item.shiny ? "shiny-entry" : ""}">
          <div class="codex-title">
            <strong style="color:${egg.color}">${item.shiny ? "Shiny " : ""}${escapeHtml(egg.name)}</strong>
            <button class="small danger" data-remove-showcase="${index}">Remove</button>
          </div>
          <div class="muted">${escapeHtml(egg.rarity)} showcase pick</div>
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
  runtime.el.eventLog.innerHTML = rows.join("") || "<div class=\"muted\">No events yet.</div>";
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
            <strong style="color:${rarity.color}">${rarity.name} Set</strong>
            <span class="codex-status">${complete ? "Active" : `${discovered}/${variants.length}`}</span>
          </div>
          <div class="muted">${bonus ? bonus.label : "No bonus configured."}</div>
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
            <span class="codex-status">${isActive ? "Active" : hatched ? "Hatched" : "Locked"}</span>
          </div>
          <div class="muted">${companion.rarity} companion, bonus: ${formatCompanionBonus(companion)}</div>
          <div class="muted">Egg owned: ${formatNumber(ownedEggs)} | Hatch cost: ${formatNumber(companion.hatchCost)} gems</div>
          <div class="settings-row">
            <button data-hatch="${companion.id}" ${canHatch ? "" : "disabled"}>Hatch</button>
            <button data-activate="${companion.id}" ${hatched ? "" : "disabled"}>${isActive ? "Active" : "Activate"}</button>
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
    { id: "base", label: "Base Recipes" },
    { id: "advanced", label: "Advanced Recipes" },
    { id: "super", label: "Super Fusion Recipes" }
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
              <span class="codex-status">${canCraft ? "Ready" : "Missing Eggs"}</span>
            </div>
            <div class="muted">Crafts: <span style="color:${resultEgg?.color || "var(--text)"}">${escapeHtml(resultEgg?.name || recipe.resultId)}</span></div>
            <div class="muted">${ingredientsText}</div>
            <div class="settings-row">
              <button data-fuse="${recipe.id}" ${canCraft ? "" : "disabled"}>Fuse</button>
              <button data-track-fusion="${recipe.id}">Track Chain</button>
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
  runtime.el.fusionLab.innerHTML = `
      <div class="fusion-toolbar">
        <input id="fusion-search-input" placeholder="Search recipes, results, ingredients..." value="${escapeHtml(runtime.fusionSearchQuery)}" />
        <select id="fusion-tier-filter">
          <option value="all" ${runtime.fusionTierFilter === "all" ? "selected" : ""}>All Tiers</option>
          <option value="base" ${runtime.fusionTierFilter === "base" ? "selected" : ""}>Base</option>
          <option value="advanced" ${runtime.fusionTierFilter === "advanced" ? "selected" : ""}>Advanced</option>
          <option value="super" ${runtime.fusionTierFilter === "super" ? "selected" : ""}>Super</option>
        </select>
        <div class="muted">Showing ${filteredRecipes.length} / ${FUSION_RECIPES.length} recipes</div>
      </div>
      ${grouped || "<div class=\"muted\">No fusion recipes match this filter.</div>"}
      <div class="fusion-chain-panel">
        <h4>Fusion Chains Visualizer</h4>
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
    btn.addEventListener("click", () => craftFusion(btn.getAttribute("data-fuse")));
  });
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
  runtime.el.ascendBtn.disabled = runtime.state.prestigeLevel < ASCENSION_CONFIG.minPrestige;

  const purchases = Number(runtime.state.dicePurchases || 0);
  const currentDice = getDiceInfo(runtime.state);
  const nextDice = getNextDiceUpgrade(runtime.state);
  const diceHtml = nextDice
    ? `
        <div class="shop-item">
          <div class="shop-item-top">
            <strong>Dice Upgrade</strong>
            <span>${purchases}/${MAX_DICE_PURCHASES}</span>
          </div>
          <div class="muted">Current: ${currentDice.name} (${currentDice.label}) → ${nextDice.name} (${nextDice.label})</div>
          <div class="muted">Cost: ${DICE_AP_COST} AP | Rolls use 1–${nextDice.sides}</div>
          <button data-buy-dice ${runtime.state.ascensionPoints >= DICE_AP_COST ? "" : "disabled"}>Buy New Die</button>
        </div>
      `
    : `
        <div class="shop-item">
          <div class="shop-item-top">
            <strong>Dice Upgrade</strong>
            <span>${MAX_DICE_PURCHASES}/${MAX_DICE_PURCHASES}</span>
          </div>
          <div class="muted">Maxed: ${currentDice.name} (${currentDice.label}, 1–${currentDice.sides})</div>
        </div>
      `;

  const html = diceHtml + ASCENSION_CONFIG.upgrades.map((upgrade) => {
    const level = Number(runtime.state.ascensionUpgrades[upgrade.id] || 0);
    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, level));
    const canBuy = runtime.state.ascensionPoints >= cost;
    return `
        <div class="shop-item">
          <div class="shop-item-top">
            <strong>${upgrade.name}</strong>
            <span>Lv ${level}</span>
          </div>
          <div class="muted">Cost: ${cost} AP | Effect: ${upgrade.effect}</div>
          <button data-asc-buy="${upgrade.id}" ${canBuy ? "" : "disabled"}>Buy</button>
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
    btn.addEventListener("click", () => buyAscensionUpgrade(btn.getAttribute("data-asc-buy")));
  });
}

export function renderGlobalEvent() {
  if (!runtime.state) {
    runtime.el.globalEventBanner.textContent = "No active event.";
    return;
  }
  const eventData = getCurrentGlobalEvent();
  if (!eventData) {
    runtime.el.globalEventBanner.textContent = "No active event.";
    return;
  }
  runtime.el.globalEventBanner.textContent = `${eventData.label} is active for today.`;
}

export function renderShop() {
  const itemsHtml = SHOP_ITEMS.map((item) => {
    const level = runtime.state ? runtime.state.upgrades[item.id] || 0 : 0;
    const cost = getUpgradeCost(item, level);
    const affordable = runtime.state ? runtime.state.coins >= cost : false;
    const effectText = getCoinShopEffectText(item);

    return `
        <div class="shop-item">
          <div class="shop-item-top">
            <strong>${item.name}</strong>
            <span>Lv ${level}</span>
          </div>
          <div class="muted">${effectText}</div>
          <button data-buy="${item.id}" ${affordable ? "" : "disabled"}>Buy (${formatNumber(cost)} coins)</button>
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

export function renderGemShop() {
  const itemsHtml = GEM_SHOP_ITEMS.map((item) => {
    const level = runtime.state ? runtime.state.gemUpgrades[item.id] || 0 : 0;
    const cost = getUpgradeCost(item, level);
    const affordable = runtime.state ? runtime.state.gems >= cost : false;
    const effectText = getGemShopEffectText(item);

    return `
        <div class="shop-item gem-item">
          <div class="shop-item-top">
            <strong>${item.name}</strong>
            <span>Lv ${level}</span>
          </div>
          <div class="muted">${effectText}</div>
          <button data-gem-buy="${item.id}" ${affordable ? "" : "disabled"}>Buy (${formatNumber(cost)} gems)</button>
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
  if (runtime.el.statRarest) runtime.el.statRarest.textContent = runtime.state.rarestEgg || "None";
  if (runtime.el.statTime) runtime.el.statTime.textContent = formatDuration(runtime.state.playtimeMs);
  if (runtime.el.statRps) runtime.el.statRps.textContent = getCurrentRPS().toFixed(2);
  if (runtime.el.statPrestige) runtime.el.statPrestige.textContent = String(runtime.state.prestigeLevel);
  const stats = runtime.state.stats || {};
  if (runtime.el.statShinies) runtime.el.statShinies.textContent = formatNumber(Object.values(runtime.state.shinyCollection || {}).reduce((sum, count) => sum + Number(count || 0), 0));
  if (runtime.el.statDryEgg) runtime.el.statDryEgg.textContent = formatNumber(stats.rollsSinceLastEgg || 0);
  if (runtime.el.statDryRare) runtime.el.statDryRare.textContent = formatNumber(stats.rollsSinceLastRarePlus || 0);
  if (runtime.el.statJackpots) runtime.el.statJackpots.textContent = formatNumber(stats.jackpotsHit || 0);
  if (runtime.el.statTitle) runtime.el.statTitle.textContent = getTitleLabel(runtime.state.activeTitle);

  const progressPercent = Math.min(100, (runtime.state.rollsSincePrestige / PRESTIGE_TARGET_ROLLS) * 100);
  if (runtime.el.prestigeProgress) runtime.el.prestigeProgress.style.width = `${progressPercent}%`;
  if (runtime.el.prestigeProgressText) {
    runtime.el.prestigeProgressText.textContent = `${formatNumber(runtime.state.rollsSincePrestige)} / ${formatNumber(PRESTIGE_TARGET_ROLLS)} rolls`;
  }
}

export function renderAchievements() {
  const html = ACHIEVEMENTS.map((a) => {
    const done = !!(runtime.state && runtime.state.achievementsUnlocked[a.id]);
    return `
        <div class="achievement-item ${done ? "done" : ""}">
          <div><strong>${a.title}</strong></div>
          <div class="muted">${done ? "Unlocked" : "Locked"} - Reward: ${a.rewardGems} gems</div>
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
    runtime.el.dailyText.textContent = "Daily reward is ready.";
    runtime.el.dailyProgress.style.width = "100%";
    runtime.el.dailyProgressText.textContent = "Ready now";
    return;
  }

  const remaining = nextAt - now;
  const passed = DAILY_REWARD_COOLDOWN_MS - remaining;
  const pct = Math.max(0, Math.min(100, (passed / DAILY_REWARD_COOLDOWN_MS) * 100));
  runtime.el.dailyBtn.disabled = true;
  runtime.el.dailyText.textContent = `${formatDuration(remaining)} remaining`;
  runtime.el.dailyProgress.style.width = `${pct}%`;
  runtime.el.dailyProgressText.textContent = `${formatDuration(remaining)} left`;
}

export function renderThemeShop() {
  if (!runtime.state || !runtime.el.themeShopList) return;
  const active = runtime.state.settings.activeTheme || "classic";
  runtime.el.themeShopList.innerHTML = THEME_SHOP.map((theme) => {
    const unlocked = isThemeUnlocked(runtime.state, theme.id);
    const equipped = active === theme.id;
    const canAfford = runtime.state.gems >= theme.cost;
    let actionLabel = "Equip";
    let actionClass = "secondary";
    if (!unlocked && theme.cost > 0) {
      actionLabel = `Unlock (${formatNumber(theme.cost)} gems)`;
      actionClass = canAfford ? "primary" : "ghost";
    } else if (equipped) {
      actionLabel = "Equipped";
      actionClass = "ghost";
    }
    return `
      <div class="theme-card ${equipped ? "equipped" : ""} ${unlocked ? "unlocked" : "locked"}">
        <div class="theme-swatch" style="background:${theme.swatch}"></div>
        <div class="theme-info">
          <strong>${escapeHtml(theme.name)}</strong>
          <span class="muted">${escapeHtml(theme.desc)}</span>
          ${!unlocked && theme.cost > 0 ? `<span class="theme-cost">${formatNumber(theme.cost)} gems</span>` : ""}
        </div>
        <button type="button" class="small ${actionClass}" data-theme-action="${theme.id}" ${equipped ? "disabled" : ""}>
          ${actionLabel}
        </button>
      </div>`;
  }).join("");
}
