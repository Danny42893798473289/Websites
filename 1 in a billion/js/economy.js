import {
  ACHIEVEMENTS,
  ALL_EGG_BY_ID,
  DAILY_REWARD_COOLDOWN_MS,
  EGG_TYPES,
  EGG_VARIANTS,
  FUSION_EGG_TYPES,
  GEM_SHOP_BY_ID,
  GEM_SHOP_ITEMS,
  PRESTIGE_MILESTONES,
  PRESTIGE_SHOP_BY_ID,
  PRESTIGE_SHOP_ITEMS,
  PRESTIGE_TARGET_ROLLS,
  SECOND_DIE_GEM_COST,
  SECOND_DIE_RPS_BY_ID,
  SECOND_DIE_TIER_UPGRADE_COSTS,
  MAX_SECOND_DIE_PURCHASES,
  getSecondDieInfo,
  getSecondDiePurchases,
  getNextSecondDieUpgrade,
  hasSecondDie,
  RARITIES,
  SHOP_BY_ID,
  SHOP_ITEMS,
  SHINY_GEM_MULTIPLIER,
  THEME_BY_ID,
  THEME_SHOP,
  getEarnedTitles,
  getTitleLabel,
  syncRarityTotals
} from "./config.js";
import { runtime } from "./runtime.js";
import { playTone } from "./audio.js";
import { setFeed, showRarePopup } from "./feedback.js";
import { formatDuration, formatNumber } from "./utils.js";
import { getCoinMultiplier, getEggValueMultiplier } from "./rolling.js";
import { getSetBonusValue } from "./progression.js";
import { applyTheme, isThemeUnlocked, selectTheme } from "./themes.js";
import { flashAchievement, flashPurchase, replayClass } from "./animations.js";

export { selectTheme, isThemeUnlocked };

export function sellRareEggs() {
  if (!runtime.state) return;
  let soldCount = 0;
  let gemsGained = 0;

  EGG_TYPES.forEach((egg) => {
    if (egg.gemValue <= 0) return;
    const amount = runtime.state.eggCollection[egg.id] || 0;
    if (amount > 0) {
      soldCount += amount;
      gemsGained += amount * egg.gemValue;
    }
  });
  FUSION_EGG_TYPES.forEach((egg) => {
    const amount = runtime.state.eggCollection[egg.id] || 0;
    if (amount > 0) {
      soldCount += amount;
      gemsGained += amount * egg.gemValue;
    }
  });

  if (soldCount <= 0) {
    setFeed("No Rare+ eggs to sell.");
    return;
  }

  gemsGained = Math.floor(gemsGained * getEggValueMultiplier());
  const confirmed = window.confirm(
    `Sell ${formatNumber(soldCount)} Rare+ eggs for ${formatNumber(gemsGained)} gems? Your codex entries stay unlocked.`
  );
  if (!confirmed) return;

  EGG_TYPES.forEach((egg) => {
    if (egg.gemValue <= 0) return;
    if ((runtime.state.eggCollection[egg.id] || 0) > 0) {
      runtime.state.eggCollection[egg.id] = 0;
    }
  });
  FUSION_EGG_TYPES.forEach((egg) => {
    if ((runtime.state.eggCollection[egg.id] || 0) > 0) {
      runtime.state.eggCollection[egg.id] = 0;
    }
  });
  syncRarityTotals(runtime.state);

  runtime.state.gems += gemsGained;
  runtime.state.totalGemsEarned += gemsGained;
  setFeed(`Sold ${formatNumber(soldCount)} Rare+ eggs for ${formatNumber(gemsGained)} gems.`);
  playTone(660, 0.12);
  checkAchievements();
}

export function sellEgg(eggId, isShiny = false) {
  if (!runtime.state || !eggId) return;
  const egg = ALL_EGG_BY_ID[eggId];
  if (!egg || Number(egg.gemValue || 0) <= 0) {
    setFeed("Only Rare+ eggs can be sold for gems.");
    return;
  }

  const collection = isShiny ? runtime.state.shinyCollection : runtime.state.eggCollection;
  const owned = Number(collection[eggId] || 0);
  if (owned <= 0) {
    setFeed(`No ${isShiny ? "Shiny " : ""}${egg.name} to sell.`);
    return;
  }

  const multiplier = isShiny ? SHINY_GEM_MULTIPLIER : 1;
  const gemsGained = Math.floor(egg.gemValue * multiplier * getEggValueMultiplier());
  collection[eggId] = owned - 1;
  syncRarityTotals(runtime.state);
  runtime.state.gems += gemsGained;
  runtime.state.totalGemsEarned += gemsGained;
  setFeed(`Sold 1 ${isShiny ? "Shiny " : ""}${egg.name} for ${formatNumber(gemsGained)} gems.`);
  playTone(isShiny ? 880 : 660, 0.12);
  checkAchievements();
}

export function doPrestige() {
  if (!runtime.state) return;
  if (runtime.state.rollsSincePrestige < PRESTIGE_TARGET_ROLLS) {
    setFeed(
      `You need ${formatNumber(PRESTIGE_TARGET_ROLLS)} rolls since last rebirth. (${formatNumber(runtime.state.rollsSincePrestige)} / ${formatNumber(PRESTIGE_TARGET_ROLLS)})`
    );
    return;
  }

  const confirmReset = window.confirm(
    "Rebirth will reset coins, eggs, and coin-shop upgrades. Gem upgrades are permanent. Continue?"
  );
  if (!confirmReset) return;

  runtime.state.prestigeLevel += 1;
  runtime.state.prestigePoints += 1;
  runtime.state.rollsSincePrestige = 0;
  runtime.state.coins = 0;
  runtime.state.gems += 50 * runtime.state.prestigeLevel;
  runtime.state.totalGemsEarned += 50 * runtime.state.prestigeLevel;
  runtime.state.upgrades = {};
  SHOP_ITEMS.forEach((item) => {
    runtime.state.upgrades[item.id] = 0;
  });
  RARITIES.forEach((r) => {
    (EGG_VARIANTS[r.name] || []).forEach((variant) => {
      runtime.state.eggCollection[variant.id] = 0;
    });
  });
  syncRarityTotals(runtime.state);
  runtime.state.lastEggId = null;
  runtime.rollBuffer = 0;
  runtime.rollBuffer2 = 0;

  setFeed(`Rebirth complete! Prestige Level is now ${runtime.state.prestigeLevel}.`, "prestige");
  replayClass(runtime.el.prestigeBtn, "prestige-burst");
  replayClass(runtime.el.rollingCard, "prestige-burst");
  claimPrestigeMilestones();
  playTone(350, 0.25);
}

export function claimPrestigeMilestones() {
  if (!runtime.state) return;
  if (!Array.isArray(runtime.state.prestigeMilestonesClaimed)) {
    runtime.state.prestigeMilestonesClaimed = [];
  }
  PRESTIGE_MILESTONES.forEach((m) => {
    if (runtime.state.prestigeLevel < m.level) return;
    if (runtime.state.prestigeMilestonesClaimed.includes(m.id)) return;
    runtime.state.prestigeMilestonesClaimed.push(m.id);
    runtime.state.gems += m.rewardGems || 0;
    runtime.state.totalGemsEarned += m.rewardGems || 0;
    if (m.luckBonus) runtime.state.prestigeMilestoneLuck = Number(runtime.state.prestigeMilestoneLuck || 0) + m.luckBonus;
    if (m.titleId && !(runtime.state.titles || []).includes(m.titleId)) {
      runtime.state.titles.push(m.titleId);
    }
    setFeed(`Prestige milestone: ${m.label}`, "prestige");
  });
}

export function checkAchievements() {
  if (!runtime.state) return;
  const earnedTitles = getEarnedTitles(runtime.state);
  runtime.state.titles = Array.from(new Set([...(runtime.state.titles || []), ...earnedTitles]));
  runtime.state.activeTitle = earnedTitles[earnedTitles.length - 1] || "newRoller";

  ACHIEVEMENTS.forEach((achievement) => {
    if (runtime.state.achievementsUnlocked[achievement.id]) return;
    if (achievement.check(runtime.state)) {
      runtime.state.achievementsUnlocked[achievement.id] = Date.now();
      runtime.state.gems += achievement.rewardGems;
      runtime.state.totalGemsEarned += achievement.rewardGems;
      showRarePopup({
        name: `Achievement Unlocked: ${achievement.title}`,
        rarity: "Achievement",
        color: "#22c55e",
        oneIn: 1
      });
      flashAchievement();
    }
  });

  const activeTitle = getTitleLabel(runtime.state.activeTitle);
  if (runtime.el.playerName && runtime.currentUser) {
    runtime.el.playerName.textContent = `${runtime.currentUser} [${activeTitle}]`;
  }
}

export function claimDailyReward() {
  if (!runtime.state) return;
  const now = Date.now();
  const nextAt = runtime.state.daily.lastClaimAt + DAILY_REWARD_COOLDOWN_MS;
  if (now < nextAt) {
    const remain = nextAt - now;
    setFeed(`Daily reward not ready. ${formatDuration(remain)} remaining.`);
    return;
  }

  const dailyBonus = 1 + getSetBonusValue("daily");
  const coinsReward = Math.floor(500 * getCoinMultiplier() * (1 + runtime.state.prestigeLevel * 0.2) * dailyBonus);
  const gemsReward = 20 + runtime.state.prestigeLevel * 4;
  runtime.state.coins += coinsReward;
  runtime.state.gems += gemsReward;
  runtime.state.totalCoinsEarned += coinsReward;
  runtime.state.totalGemsEarned += gemsReward;
  runtime.state.daily.lastClaimAt = now;
  setFeed(`Daily reward claimed: +${formatNumber(coinsReward)} coins, +${formatNumber(gemsReward)} gems.`);
  playTone(740, 0.18);
}

export function getUpgradeCost(item, level) {
  return Math.floor(item.baseCost * Math.pow(item.growth, level));
}

export function buyUpgrade(itemId) {
  if (!runtime.state) return;
  const item = SHOP_BY_ID[itemId];
  if (!item) return;
  const level = runtime.state.upgrades[item.id] || 0;
  const cost = getUpgradeCost(item, level);
  if (runtime.state.coins < cost) {
    setFeed("Not enough coins.");
    return;
  }
  runtime.state.coins -= cost;
  runtime.state.upgrades[item.id] = level + 1;
  setFeed(`Purchased ${item.name} Lv ${runtime.state.upgrades[item.id]}.`);
  flashPurchase();
  playTone(510, 0.08);
}

export function buyGemUpgrade(itemId) {
  if (!runtime.state) return;
  const item = GEM_SHOP_BY_ID[itemId];
  if (!item) return;
  const level = runtime.state.gemUpgrades[item.id] || 0;
  const cost = getUpgradeCost(item, level);
  if (runtime.state.gems < cost) {
    setFeed("Not enough gems.");
    return;
  }
  runtime.state.gems -= cost;
  runtime.state.gemUpgrades[item.id] = level + 1;
  setFeed(`Purchased ${item.name} Lv ${runtime.state.gemUpgrades[item.id]} with gems.`);
  flashPurchase();
  playTone(620, 0.1);
}

export function getCoinShopEffectText(item) {
  if (item.type === "auto") return `+${item.effect} rolls/sec`;
  if (item.id === "luck") return `+${Math.round(item.effect * 100)}% luck`;
  if (item.id === "coinMult") return `+${Math.round(item.effect * 100)}% coin gain`;
  if (item.id === "fastRoll") return `+${Math.round(item.effect * 100)}% speed`;
  return `+${Math.round(item.effect * 100)}% gem sell value`;
}

export function getGemShopEffectText(item) {
  if (item.id === "gemLuck") return `+${Math.round(item.effect * 100)}% permanent luck`;
  if (item.id === "gemCoins") return `+${Math.round(item.effect * 100)}% permanent coins`;
  if (item.id === "gemAuto") return `+${item.effect} permanent rolls/sec`;
  if (item.id === "gemValue") return `+${Math.round(item.effect * 100)}% egg sell value`;
  return `+${Math.round(item.effect * 100)}% prestige coin bonus`;
}

export function getPrestigeShopEffectText(item) {
  if (item.id === "ppLuck") return `+${Math.round(item.effect * 100)}% permanent luck per level`;
  if (item.id === "ppOffline") return `+${Math.round(item.effect * 100)}% offline efficiency per level`;
  if (item.id === "ppIncubator") return `+${item.effect} incubator slot per level`;
  if (item.id === "ppRelic") return `+${item.effect} relic slot per level`;
  if (item.id === "ppRps2") return `+${item.effect} Die 2 RPS per level`;
  return `+${item.effect}`;
}

export function buyPrestigeUpgrade(itemId) {
  if (!runtime.state) return;
  const item = PRESTIGE_SHOP_BY_ID[itemId];
  if (!item) return;
  const level = Number(runtime.state.prestigeUpgrades[item.id] || 0);
  if (item.maxLevel && level >= item.maxLevel) {
    setFeed(`${item.name} is maxed.`);
    return;
  }
  const cost = getUpgradeCost(item, level);
  if (runtime.state.prestigePoints < cost) {
    setFeed("Not enough prestige points.");
    return;
  }
  runtime.state.prestigePoints -= cost;
  runtime.state.prestigeUpgrades[item.id] = level + 1;
  setFeed(`Purchased ${item.name} Lv ${runtime.state.prestigeUpgrades[item.id]}.`);
  flashPurchase();
  playTone(580, 0.1);
}

export function buySecondDie() {
  if (!runtime.state) return;
  if (runtime.state.secondDieOwned) {
    setFeed("You already own the second die.");
    return;
  }
  if (runtime.state.gems < SECOND_DIE_GEM_COST) {
    setFeed(`Need ${formatNumber(SECOND_DIE_GEM_COST)} gems to unlock the second die.`);
    return;
  }
  const die = getSecondDieInfo(runtime.state);
  runtime.state.gems -= SECOND_DIE_GEM_COST;
  runtime.state.secondDieOwned = true;
  runtime.state.secondDiePurchases = 0;
  setFeed(`Unlocked ${die.name} (${die.label})! Die 2 manual rolls and +${formatNumber(1)} RPS 2 are now active.`, "shop");
  playTone(660, 0.15);
}

export function buySecondDieTier() {
  if (!runtime.state?.secondDieOwned) {
    setFeed("Unlock the second die in the Dice Shop first.");
    return;
  }
  const purchases = getSecondDiePurchases(runtime.state);
  if (purchases >= MAX_SECOND_DIE_PURCHASES) {
    setFeed("Die 2 is already max tier.");
    return;
  }
  const cost = SECOND_DIE_TIER_UPGRADE_COSTS[purchases];
  if (runtime.state.gems < cost) {
    setFeed(`Need ${formatNumber(cost)} gems to upgrade Die 2.`);
    return;
  }
  const next = getNextSecondDieUpgrade(runtime.state);
  if (!next) return;
  runtime.state.gems -= cost;
  runtime.state.secondDiePurchases = purchases + 1;
  setFeed(`Upgraded Die 2 to ${next.name} (${next.label}, 1–${next.sides})!`, "shop");
  playTone(720, 0.15);
}

export function buySecondDieRpsUpgrade(itemId) {
  if (!runtime.state?.secondDieOwned) {
    setFeed("Unlock the second die in the Dice Shop first.");
    return;
  }
  const item = SECOND_DIE_RPS_BY_ID[itemId];
  if (!item) return;
  if (!runtime.state.secondDieUpgrades) runtime.state.secondDieUpgrades = {};
  const level = Number(runtime.state.secondDieUpgrades[itemId] || 0);
  const cost = getUpgradeCost(item, level);
  if (runtime.state.gems < cost) {
    setFeed(`Need ${formatNumber(cost)} gems for ${item.name}.`);
    return;
  }
  runtime.state.gems -= cost;
  runtime.state.secondDieUpgrades[itemId] = level + 1;
  setFeed(`Purchased ${item.name} Lv ${level + 1} (+${item.effect} RPS 2).`, "shop");
  playTone(580, 0.12);
}

export function getSecondDieRpsEffectText(item) {
  return `+${item.effect} Die 2 rolls/sec per level`;
}

export function buyTheme(themeId) {
  if (!runtime.state) return;
  const theme = THEME_BY_ID[themeId];
  if (!theme) return;
  if (isThemeUnlocked(runtime.state, themeId)) {
    selectTheme(themeId);
    setFeed(`Equipped ${theme.name} theme.`);
    return;
  }
  if (theme.cost <= 0) {
    selectTheme(themeId);
    return;
  }
  if (runtime.state.gems < theme.cost) {
    setFeed(`Need ${formatNumber(theme.cost)} gems for ${theme.name}.`);
    return;
  }
  runtime.state.gems -= theme.cost;
  if (!runtime.state.settings.unlockedThemes.includes(themeId)) {
    runtime.state.settings.unlockedThemes.push(themeId);
  }
  runtime.state.settings.activeTheme = themeId;
  applyTheme(runtime.state.settings);
  setFeed(`Unlocked and equipped ${theme.name} theme!`);
  playTone(720, 0.14);
}
