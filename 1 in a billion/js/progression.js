import {
  ALL_EGG_BY_ID,
  ASCENSION_CONFIG,
  AUTO_FUSION_BASE_INTERVAL_MS,
  AUTO_FUSION_MIN_INTERVAL_MS,
  AUTO_FUSION_SPEED_BONUS,
  AUTO_FUSION_TIER_ORDER,
  DICE_AP_COST,
  MAX_DICE_PURCHASES,
  getNextDiceUpgrade,
  COMPANION_VARIANTS,
  EGG_TYPES,
  EGG_VARIANTS,
  FUSION_EGG_BY_ID,
  FUSION_EGG_TYPES,
  FUSION_RECIPES,
  GEM_SHOP_ITEMS,
  RARITIES,
  SET_BONUS_CONFIG,
  SHOP_ITEMS,
  syncRarityTotals
} from "./config.js";
import { runtime } from "./runtime.js";
import { markEggDiscovered } from "./state.js";
import { escapeHtml, formatDuration } from "./utils.js";
import { setFeed } from "./feedback.js";
import { bumpChallenge } from "./challenges.js";
import { t } from "./i18n.js";

export function checkSetCompletions() {
  if (!runtime.state) return;
  RARITIES.forEach((rarity) => {
    const variants = EGG_VARIANTS[rarity.name] || [];
    if (variants.length === 0) return;
    const done = variants.every((variant) => Number(runtime.state.eggCollection[variant.id] || 0) > 0);
    const setBonus = SET_BONUS_CONFIG[rarity.name];

    if (!done && runtime.state.completedSets[rarity.name]) {
      runtime.state.completedSets[rarity.name] = false;
      if (setBonus) {
        delete runtime.state.activeSetBonuses[setBonus.bonusId];
      }
    }

    if (done && !runtime.state.completedSets[rarity.name]) {
      runtime.state.completedSets[rarity.name] = true;
      if (setBonus) {
        runtime.state.activeSetBonuses[setBonus.bonusId] = true;
        const msg = `${rarity.name} Set completed: ${setBonus.label}`;
        setFeed(msg, "set");
      }
    }
  });
}

export function getSetBonusValue(type) {
  if (!runtime.state?.completedSets) return 0;
  return Object.entries(SET_BONUS_CONFIG).reduce((sum, [rarityName, config]) => {
    if (!runtime.state.completedSets[rarityName]) return sum;
    if (config.type !== type) return sum;
    return sum + config.value;
  }, 0);
}

export function getCompanionBonusValue(type) {
  if (!runtime.state.activeCompanionId) return 0;
  const companion = COMPANION_VARIANTS.find((item) => item.id === runtime.state.activeCompanionId);
  if (!companion || companion.buffType !== type) return 0;
  return companion.buffValue;
}

export function formatCompanionBonus(companion) {
  if (companion.buffType === "rps") return `+${companion.buffValue} RPS`;
  return `+${Math.round(companion.buffValue * 100)}% ${companion.buffType}`;
}

export function hatchCompanion(companionId) {
  const companion = COMPANION_VARIANTS.find((c) => c.id === companionId);
  if (!companion) return;
  if ((runtime.state.eggCollection[companion.id] || 0) < 1 || runtime.state.gems < companion.hatchCost) return;
  runtime.state.eggCollection[companion.id] -= 1;
  runtime.state.gems -= companion.hatchCost;
  runtime.state.hatchedCompanions[companion.id] = 1;
  syncRarityTotals(runtime.state);
  const msg = `Hatched companion: ${companion.name}`;
  setFeed(msg, "companion");
  bumpChallenge("hatch_1");
}

export function activateCompanion(companionId) {
  if (!runtime.state.hatchedCompanions[companionId]) return;
  runtime.state.activeCompanionId = companionId;
  const companion = COMPANION_VARIANTS.find((c) => c.id === companionId);
  const msg = `Activated companion: ${companion.name}`;
  setFeed(msg, "companion");
}

export function getFusionRecipeTier(recipe) {
  if (recipe.resultId === "fusion_omnistar" || recipe.resultId === "fusion_transcendent" || recipe.resultId === "fusion_paragon") {
    return "super";
  }
  if (recipe.ingredients.some((ingredient) => !!FUSION_EGG_BY_ID[ingredient.eggId])) {
    return "advanced";
  }
  return "base";
}

export function getFusionRecipeSearchText(recipe) {
  const resultEgg = FUSION_EGG_BY_ID[recipe.resultId];
  const ingredientNames = recipe.ingredients
    .map((ingredient) => ALL_EGG_BY_ID[ingredient.eggId]?.name || ingredient.eggId)
    .join(" ");
  return `${recipe.name} ${resultEgg?.name || ""} ${ingredientNames}`.toLowerCase();
}

export function renderFusionChainsVisualizer() {
  const topTargets = ["fusion_omnistar", "fusion_transcendent", "fusion_paragon", "fusion_absolute"];
  const blocks = topTargets.map((targetId) => {
    const egg = FUSION_EGG_BY_ID[targetId];
    const recipes = FUSION_RECIPES.filter((recipe) => recipe.resultId === targetId);
    if (!egg || recipes.length === 0) return "";
    const recipeLines = recipes.map((recipe) => {
      const chainText = recipe.ingredients.map((ingredient) => describeFusionIngredientChain(ingredient.eggId, 0, new Set())).join(" + ");
      const selected = runtime.fusionSelectedRecipeId === recipe.id ? "done" : "";
      return `<div class="fusion-chain-step ${selected}"><strong>${escapeHtml(recipe.name)}</strong>: ${escapeHtml(chainText)}</div>`;
    }).join("");
    return `
        <div class="fusion-chain-target">
          <div class="codex-title">
            <strong style="color:${egg.color}">${escapeHtml(egg.name)}</strong>
            <span class="codex-status">${recipes.length} recipe${recipes.length > 1 ? "s" : ""}</span>
          </div>
          ${recipeLines}
        </div>
      `;
  }).filter(Boolean);
  return blocks.join("") || "<div class=\"muted\">No chain data available yet.</div>";
}

export function describeFusionIngredientChain(eggId, depth, visited) {
  const egg = ALL_EGG_BY_ID[eggId];
  const eggName = egg?.name || eggId;
  if (!FUSION_EGG_BY_ID[eggId] || depth >= 2 || visited.has(eggId)) {
    return eggName;
  }
  const recipe = FUSION_RECIPES.find((item) => item.resultId === eggId);
  if (!recipe) return eggName;
  const nextVisited = new Set(visited);
  nextVisited.add(eggId);
  const children = recipe.ingredients.map((ingredient) => describeFusionIngredientChain(ingredient.eggId, depth + 1, nextVisited)).join(" + ");
  return `${eggName} <= ${recipe.name} (${children})`;
}

export function canCraftFusionRecipe(recipe) {
  if (!runtime.state) return false;
  return recipe.ingredients.every((ingredient) => {
    return Number(runtime.state.eggCollection[ingredient.eggId] || 0) >= ingredient.count;
  });
}

export function hasAutoFusionUnlock(state) {
  return Number(state?.ascensionUpgrades?.ascFusion || 0) >= 1;
}

export function getAutoFusionIntervalMs(state) {
  const speedLevel = Number(state?.ascensionUpgrades?.ascFusionSpeed || 0);
  const fusionsPerSec = 1000 / AUTO_FUSION_BASE_INTERVAL_MS + speedLevel * AUTO_FUSION_SPEED_BONUS;
  return Math.max(AUTO_FUSION_MIN_INTERVAL_MS, Math.floor(1000 / fusionsPerSec));
}

export function findNextCraftableRecipe() {
  if (!runtime.state) return null;
  for (const tier of AUTO_FUSION_TIER_ORDER) {
    for (const recipe of FUSION_RECIPES) {
      if (getFusionRecipeTier(recipe) !== tier) continue;
      if (canCraftFusionRecipe(recipe)) return recipe;
    }
  }
  return null;
}

export function applyFusion(recipe, { silent = false } = {}) {
  if (!runtime.state || !recipe) return false;
  if (!canCraftFusionRecipe(recipe)) return false;

  recipe.ingredients.forEach((ingredient) => {
    runtime.state.eggCollection[ingredient.eggId] -= ingredient.count;
  });
  runtime.state.eggCollection[recipe.resultId] = Number(runtime.state.eggCollection[recipe.resultId] || 0) + 1;
  markEggDiscovered(runtime.state, recipe.resultId);
  runtime.state.fusionCraftCount = Number(runtime.state.fusionCraftCount || 0) + 1;
  syncRarityTotals(runtime.state);
  bumpChallenge("fusion_3");

  const resultEgg = FUSION_EGG_BY_ID[recipe.resultId];
  if (!silent) {
    setFeed(`Fusion success: ${recipe.name} created ${resultEgg?.name || recipe.resultId}.`, "fusion");
  } else {
    runtime.autoFusionBatch = Number(runtime.autoFusionBatch || 0) + 1;
    if (runtime.autoFusionBatch >= 5) {
      setFeed(t("fusion.autoBatch", { n: runtime.autoFusionBatch }), "fusion");
      runtime.autoFusionBatch = 0;
    }
  }
  return true;
}

export function tryAutoFusion() {
  if (!runtime.state || !hasAutoFusionUnlock(runtime.state) || !runtime.state.settings.autoFusionEnabled) {
    return false;
  }
  const recipe = findNextCraftableRecipe();
  if (!recipe) return false;
  return applyFusion(recipe, { silent: true });
}

export function getAutoFusionStatusText() {
  if (!runtime.state) return "";
  if (!hasAutoFusionUnlock(runtime.state)) return t("fusion.autoLocked");
  if (!runtime.state.settings.autoFusionEnabled) return t("fusion.autoOff");
  if (!findNextCraftableRecipe()) return t("fusion.autoWaiting");
  const interval = getAutoFusionIntervalMs(runtime.state);
  const remaining = Math.max(0, interval - Number(runtime.fusionBuffer || 0));
  return t("fusion.autoOn", { time: formatDuration(remaining) });
}

export function getAscensionUpgradeEffectText(upgrade) {
  if (upgrade.id === "ascFusion") return t("asc.ascFusionEffect");
  if (upgrade.id === "ascFusionSpeed") {
    return t("asc.ascFusionSpeedEffect", { n: Math.round(upgrade.effect * 100) });
  }
  if (upgrade.id === "ascLuck") return t("asc.ascLuckEffect", { n: Math.round(upgrade.effect * 100) });
  if (upgrade.id === "ascCoins") return t("asc.ascCoinsEffect", { n: Math.round(upgrade.effect * 100) });
  if (upgrade.id === "ascRps") return t("asc.ascRpsEffect", { n: upgrade.effect });
  return `+${upgrade.effect}`;
}

export function craftFusion(recipeId) {
  const recipe = FUSION_RECIPES.find((item) => item.id === recipeId);
  if (!recipe) return;
  applyFusion(recipe, { silent: false });
}

export function doAscend() {
  if (!runtime.state) return;
  if (runtime.state.prestigeLevel < ASCENSION_CONFIG.minPrestige) {
    setFeed(`Ascension unlocks at Prestige ${ASCENSION_CONFIG.minPrestige}.`);
    return;
  }
  const gain = Math.max(ASCENSION_CONFIG.baseGain, Math.floor(runtime.state.prestigeLevel / ASCENSION_CONFIG.minPrestige));
  const confirmed = window.confirm(
    `Ascend for ${gain} Ascension Point(s)? This resets coins, gems, eggs, coin shop, gem shop, companions, and set progress. Ascension upgrades, dice upgrades, and bonus RPS are permanent. Continue?`
  );
  if (!confirmed) return;

  runtime.state.ascensionLevel += 1;
  runtime.state.ascensionPoints += gain;
  runtime.state.prestigeLevel = 0;
  runtime.state.prestigePoints = 0;
  runtime.state.rollsSincePrestige = 0;
  runtime.state.coins = 0;
  runtime.state.gems = 0;
  runtime.state.manualStreak = 0;
  runtime.state.upgrades = {};
  SHOP_ITEMS.forEach((item) => { runtime.state.upgrades[item.id] = 0; });
  runtime.state.gemUpgrades = {};
  GEM_SHOP_ITEMS.forEach((item) => { runtime.state.gemUpgrades[item.id] = 0; });
  runtime.state.eggCollection = {};
  EGG_TYPES.forEach((egg) => { runtime.state.eggCollection[egg.id] = 0; });
  FUSION_EGG_TYPES.forEach((egg) => { runtime.state.eggCollection[egg.id] = 0; });
  runtime.state.hatchedCompanions = {};
  runtime.state.activeCompanionId = null;
  runtime.state.completedSets = {};
  runtime.state.activeSetBonuses = {};
  runtime.rollBuffer = 0;
  runtime.rollBuffer2 = 0;
  syncRarityTotals(runtime.state);
  setFeed(`Ascension complete! You gained ${gain} points.`, "ascension");
}

export function buyDiceUpgrade() {
  if (!runtime.state) return;
  const purchases = Number(runtime.state.dicePurchases || 0);
  if (purchases >= MAX_DICE_PURCHASES) {
    setFeed("You already own the best dice (2/2 upgrades).");
    return;
  }
  if (runtime.state.ascensionPoints < DICE_AP_COST) {
    setFeed(`Need ${DICE_AP_COST} Ascension Points to buy a new die.`);
    return;
  }
  const next = getNextDiceUpgrade(runtime.state);
  if (!next) return;
  runtime.state.ascensionPoints -= DICE_AP_COST;
  runtime.state.dicePurchases = purchases + 1;
  setFeed(`Unlocked ${next.name} (${next.label})! Rolls now use 1–${next.sides}.`, "ascension");
}

export function buyAscensionUpgrade(upgradeId) {
  const upgrade = ASCENSION_CONFIG.upgrades.find((u) => u.id === upgradeId);
  if (!upgrade || !runtime.state) return;
  const level = Number(runtime.state.ascensionUpgrades[upgradeId] || 0);
  if (upgrade.maxLevel && level >= upgrade.maxLevel) {
    setFeed(`${upgrade.name} is maxed.`);
    return;
  }
  const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, level));
  if (runtime.state.ascensionPoints < cost) return;
  runtime.state.ascensionPoints -= cost;
  runtime.state.ascensionUpgrades[upgradeId] = level + 1;
  setFeed(`Purchased ${upgrade.name} Lv ${runtime.state.ascensionUpgrades[upgradeId]}.`, "ascension");
}
