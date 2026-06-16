import {
  ASCENSION_CONFIG,
  GEM_SHOP_BY_ID,
  JACKPOT_COIN_MULTIPLIER,
  JACKPOT_ONE_IN,
  LUCKY_ROLL_COOLDOWN_MS,
  LUCKY_ROLL_COST_GEMS,
  OFFLINE_MAX_MS,
  OFFLINE_MAX_ROLLS,
  OFFLINE_MAX_ROLLS_LOGIN_MOBILE,
  OFFLINE_MAX_ROLLS_LOGIN_DES,
  OFFLINE_PENDING_CHUNK_MOBILE,
  OFFLINE_PENDING_CHUNK_DES,
  OFFLINE_ROLL_CHUNK,
  OFFLINE_ROLL_EFFICIENCY,
  RARITIES,
  SHOP_BY_ID,
  SHINY_BASE_ONE_IN,
  STREAK_BONUS_MAX,
  STREAK_BONUS_STEP,
  STREAK_TIMEOUT_MS,
  SUPER_LUCKY_LUCK_MULT,
  SECOND_DIE_BASE_RPS,
  SECOND_DIE_RPS_ITEMS,
  PRESTIGE_SHOP_BY_ID,
  getDiceSides,
  getPrimaryDieInfo,
  getSecondDieInfo,
  hasSecondDie,
  getRarityIndex,
  pickRandomEggForRarity,
  syncRarityTotals
} from "./config.js";
import { runtime } from "./runtime.js";
import { markEggDiscovered, markShinyDiscovered, isEggDiscovered } from "./state.js";
import { playClickTone, playToneByRarity } from "./audio.js";
import { setFeed, showRarePopup, triggerRareFx } from "./feedback.js";
import { escapeHtml, formatDuration, formatNumber } from "./utils.js";
import { checkAchievements } from "./economy.js";
import { getGlobalEventBonus } from "./events.js";
import { bumpChallenge, ensureWeeklyChallenges } from "./challenges.js";
import { bumpGuildScore, getGuildCoinBonus } from "./guilds.js";
import { getSeasonLuckBoost } from "./seasons.js";
import { checkRelicUnlocks, getRelicBonus } from "./relics.js";
import {
  checkSetCompletions,
  getCompanionBonusValue,
  getSetBonusValue
} from "./progression.js";

export async function applyOfflineProgress({ loginBoot = false } = {}) {
  if (!runtime.state || runtime.offlineProgressRunning) return;
  const now = Date.now();
  const last = Number(runtime.state.lastSessionAt || now);
  const deltaMs = Math.max(0, Math.min(OFFLINE_MAX_MS, now - last));
  runtime.state.lastSessionAt = now;

  if (deltaMs < 15000) {
    if (runtime.el.offlineInfo) {
      runtime.el.offlineInfo.textContent = "Offline progress applies automatically when you log in.";
    }
    return;
  }

  const offlineRps1 = getPrimaryRPS();
  const offlineRps2 = getSecondDieRPS();
  const offlineRps = offlineRps1 + offlineRps2;
  if (offlineRps <= 0) {
    if (runtime.el.offlineInfo) {
      runtime.el.offlineInfo.textContent = `You were away for ${formatDuration(deltaMs)}. Buy auto rollers to gain while offline.`;
    }
    return;
  }

  const ppOffline = Number(runtime.state.prestigeUpgrades?.ppOffline || 0) * (PRESTIGE_SHOP_BY_ID.ppOffline?.effect || 0);
  const offlineEfficiency =
    OFFLINE_ROLL_EFFICIENCY * (1 + getSetBonusValue("offline") + getCompanionBonusValue("offline") + ppOffline);
  const calculatedRolls = Math.min(
    OFFLINE_MAX_ROLLS,
    Math.floor((deltaMs / 1000) * offlineRps * offlineEfficiency)
  );
  if (calculatedRolls <= 0) return;

  const loginCap = runtime.isMobile
    ? OFFLINE_MAX_ROLLS_LOGIN_MOBILE
    : OFFLINE_MAX_ROLLS_LOGIN_DES;
  const rollsNow = loginBoot ? Math.min(calculatedRolls, loginCap) : calculatedRolls;
  const rollsLater = loginBoot ? Math.max(0, calculatedRolls - rollsNow) : 0;

  const rolls1 = offlineRps > 0 ? Math.floor(rollsNow * (offlineRps1 / offlineRps)) : rollsNow;
  const rolls2 = rollsNow - rolls1;
  const later1 = offlineRps > 0 ? Math.floor(rollsLater * (offlineRps1 / offlineRps)) : rollsLater;
  const later2 = rollsLater - later1;

  runtime.offlineProgressRunning = true;
  try {
    await performRollBatched(rolls1, false);
    await performSecondRollBatched(rolls2, false);
    if (rollsLater > 0) {
      runtime.pendingOfflineRolls += later1;
      runtime.pendingOfflineRolls2 += later2;
    }
    const message = rollsLater > 0
      ? `Offline gains started: ${formatNumber(rollsNow)} rolls now, ${formatNumber(rollsLater)} more rolling in.`
      : `Offline gains: ${formatNumber(rollsNow)} rolls while away (${formatDuration(deltaMs)}).`;
    setFeed(message, "offline");
    if (runtime.el.offlineInfo) {
      runtime.el.offlineInfo.textContent = message;
    }
  } finally {
    runtime.offlineProgressRunning = false;
  }
}

export function processPendingOfflineRolls() {
  if (!runtime.state || runtime.offlineProgressRunning) return false;
  const pending1 = runtime.pendingOfflineRolls || 0;
  const pending2 = runtime.pendingOfflineRolls2 || 0;
  if (pending1 <= 0 && pending2 <= 0) return false;

  const chunkCap = runtime.isMobile ? OFFLINE_PENDING_CHUNK_MOBILE : OFFLINE_PENDING_CHUNK_DES;
  if (pending1 > 0) {
    const chunk = Math.min(chunkCap, pending1);
    performRoll(chunk, false);
    runtime.pendingOfflineRolls -= chunk;
  } else if (pending2 > 0 && hasSecondDie(runtime.state)) {
    const chunk = Math.min(chunkCap, pending2);
    performSecondRoll(chunk, false);
    runtime.pendingOfflineRolls2 -= chunk;
  }
  return true;
}

export async function performSecondRollBatched(count, isManual) {
  if (count <= 0) return;
  const chunkSize = runtime.isMobile ? Math.min(OFFLINE_ROLL_CHUNK, 20) : OFFLINE_ROLL_CHUNK;
  let remaining = count;
  while (remaining > 0) {
    const batch = Math.min(chunkSize, remaining);
    performSecondRoll(batch, isManual);
    remaining -= batch;
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, runtime.isMobile ? 20 : 0));
    }
  }
}

export async function performRollBatched(count, isManual) {
  if (count <= 0) return;
  const chunkSize = runtime.isMobile ? Math.min(OFFLINE_ROLL_CHUNK, 20) : OFFLINE_ROLL_CHUNK;
  let remaining = count;
  while (remaining > 0) {
    const batch = Math.min(chunkSize, remaining);
    performRoll(batch, isManual);
    remaining -= batch;
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, runtime.isMobile ? 20 : 0));
    }
  }
}

function ensureRollStats() {
  if (!runtime.state.stats || typeof runtime.state.stats !== "object") {
    runtime.state.stats = {
      rollsSinceLastEgg: 0,
      rollsSinceLastRarePlus: 0,
      jackpotsHit: 0
    };
  }
}

export function performRoll(count, isManual) {
  if (!runtime.state || count <= 0) return;
  ensureRollStats();
  let rarestThisBatch = null;
  let shinyThisBatch = null;
  let jackpotsHit = 0;
  let lastDie = "-";
  let eggsChanged = false;
  if (isManual) {
    if (runtime.el.rollBtn) {
      runtime.el.rollBtn.classList.remove("roll-shake");
      void runtime.el.rollBtn.offsetWidth;
      runtime.el.rollBtn.classList.add("roll-shake");
    }
    if (Date.now() - runtime.state.lastManualRollAt > STREAK_TIMEOUT_MS) {
      runtime.state.manualStreak = 0;
    }
    runtime.state.manualStreak += 1;
    runtime.state.lastManualRollAt = Date.now();
    ensureWeeklyChallenges();
    const streakTask = runtime.state.weeklyChallenges?.tasks?.streak_10;
    if (streakTask && !streakTask.claimed) {
      streakTask.progress = Math.max(Number(streakTask.progress || 0), runtime.state.manualStreak);
    }
  }

  for (let i = 0; i < count; i += 1) {
    const die = rollDie();
    lastDie = die;
    const manualStreakBonus = isManual ? 1 + getManualStreakBonus() : 1;
    const coinMult = getCoinMultiplier();
    let coinGain = Math.floor(die * (Number.isFinite(coinMult) ? coinMult : 1) * manualStreakBonus);
    if (randomOneIn(JACKPOT_ONE_IN)) {
      coinGain *= JACKPOT_COIN_MULTIPLIER;
      jackpotsHit += 1;
      runtime.state.stats.jackpotsHit += 1;
    }
    runtime.state.coins += coinGain;
    runtime.state.totalCoinsEarned += coinGain;
    runtime.state.totalRolls += 1;
    runtime.state.rollsSincePrestige += 1;
    runtime.state.stats.rollsSinceLastEgg += 1;
    runtime.state.stats.rollsSinceLastRarePlus += 1;

    const egg = maybeGetEgg();
    if (egg) {
      const wasNew = !isEggDiscovered(runtime.state, egg.id);
      runtime.state.eggCollection[egg.id] = (runtime.state.eggCollection[egg.id] || 0) + 1;
      runtime.state.lastEggId = egg.id;
      markEggDiscovered(runtime.state, egg.id);
      if (wasNew) bumpChallenge("discover_1");
      runtime.state.stats.rollsSinceLastEgg = 0;
      eggsChanged = true;

      if (getRarityIndex(egg.rarity) >= getRarityIndex("Rare")) {
        runtime.state.stats.rollsSinceLastRarePlus = 0;
      }

      if (maybeMakeShiny()) {
        egg.shiny = true;
        runtime.state.shinyCollection[egg.id] = Number(runtime.state.shinyCollection[egg.id] || 0) + 1;
        markShinyDiscovered(runtime.state, egg.id);
        shinyThisBatch = egg;
      }

      if (!runtime.state.rarestEgg || getRarityIndex(egg.rarity) > getRarityIndex(runtime.state.rarestEgg)) {
        runtime.state.rarestEgg = egg.rarity;
      }

      if (!rarestThisBatch || getRarityIndex(egg.rarity) > getRarityIndex(rarestThisBatch.rarity)) {
        rarestThisBatch = egg;
      }
    }
  }

  if (eggsChanged) {
    syncRarityTotals(runtime.state);
    checkSetCompletions();
  }

  bumpChallenge("rolls_500", count);
  runtime.state.seasonRolls = Number(runtime.state.seasonRolls || 0) + count;
  if (runtime.state.guildId) bumpGuildScore(Math.min(count, 5));

  if (runtime.el.lastRoll) {
    runtime.el.lastRoll.textContent = String(lastDie);
  }
  if (rarestThisBatch) {
    if (runtime.el.lastEgg) {
      const shinyLabel = rarestThisBatch.shiny ? "Shiny " : "";
      runtime.el.lastEgg.innerHTML =
        `<span style="color:${rarestThisBatch.color}">${rarestThisBatch.rarity}</span> - ` +
        `${shinyLabel}${escapeHtml(rarestThisBatch.name)} (1 in ${formatNumber(rarestThisBatch.oneIn)})`;
    }
    if (isManual || count <= 5) {
      setFeed(
        `You obtained ${rarestThisBatch.shiny ? "Shiny " : ""}${rarestThisBatch.name} [${rarestThisBatch.rarity}]! Odds: 1 in ${formatNumber(rarestThisBatch.oneIn)}.`
      );
    }
    if (getRarityIndex(rarestThisBatch.rarity) >= getRarityIndex("Epic") || rarestThisBatch.shiny) {
      showRarePopup(rarestThisBatch);
      triggerRareFx();
    }
    playToneByRarity(rarestThisBatch.rarity);
  } else if (jackpotsHit > 0) {
    setFeed(`Jackpot! ${formatNumber(jackpotsHit)} roll${jackpotsHit === 1 ? "" : "s"} paid ${formatNumber(JACKPOT_COIN_MULTIPLIER)}x coins.`, "jackpot");
  } else if (isManual) {
    if (runtime.el.lastEgg) {
      runtime.el.lastEgg.textContent = "None";
    }
    setFeed("No egg this roll. Keep rolling!");
    playClickTone();
  }

  if (shinyThisBatch && shinyThisBatch !== rarestThisBatch) {
    showRarePopup(shinyThisBatch);
    triggerRareFx();
    setFeed(`Shiny found: ${shinyThisBatch.name} [${shinyThisBatch.rarity}]!`, "shiny");
  }

  checkAchievements();
  checkRelicUnlocks();
}

export function performSecondRoll(count, isManual) {
  if (!runtime.state || count <= 0 || !hasSecondDie(runtime.state)) return;
  ensureRollStats();
  const dieInfo = getSecondDieInfo(runtime.state);
  let rarestThisBatch = null;
  let shinyThisBatch = null;
  let jackpotsHit = 0;
  let lastDie = "-";
  let eggsChanged = false;

  if (isManual) {
    if (runtime.el.rollBtn2) {
      runtime.el.rollBtn2.classList.remove("roll-shake");
      void runtime.el.rollBtn2.offsetWidth;
      runtime.el.rollBtn2.classList.add("roll-shake");
    }
    if (Date.now() - runtime.state.lastManualRollAt > STREAK_TIMEOUT_MS) {
      runtime.state.manualStreak = 0;
    }
    runtime.state.manualStreak += 1;
    runtime.state.lastManualRollAt = Date.now();
    ensureWeeklyChallenges();
    const streakTask = runtime.state.weeklyChallenges?.tasks?.streak_10;
    if (streakTask && !streakTask.claimed) {
      streakTask.progress = Math.max(Number(streakTask.progress || 0), runtime.state.manualStreak);
    }
  }

  for (let i = 0; i < count; i += 1) {
    const die = rollSecondDie();
    lastDie = die;
    const manualStreakBonus = isManual ? 1 + getManualStreakBonus() : 1;
    const coinMult = getCoinMultiplier();
    let coinGain = Math.floor(
      die * (Number.isFinite(coinMult) ? coinMult : 1) * manualStreakBonus * (dieInfo.luckMult || 1)
    );
    if (randomOneIn(JACKPOT_ONE_IN)) {
      coinGain *= JACKPOT_COIN_MULTIPLIER;
      jackpotsHit += 1;
      runtime.state.stats.jackpotsHit += 1;
    }
    runtime.state.coins += coinGain;
    runtime.state.totalCoinsEarned += coinGain;
    runtime.state.totalRolls += 1;
    runtime.state.rollsSincePrestige += 1;
    runtime.state.stats.rollsSinceLastEgg += 1;
    runtime.state.stats.rollsSinceLastRarePlus += 1;

    const egg = maybeGetEgg();
    if (egg) {
      const wasNew = !isEggDiscovered(runtime.state, egg.id);
      runtime.state.eggCollection[egg.id] = (runtime.state.eggCollection[egg.id] || 0) + 1;
      runtime.state.lastEggId = egg.id;
      markEggDiscovered(runtime.state, egg.id);
      if (wasNew) bumpChallenge("discover_1");
      runtime.state.stats.rollsSinceLastEgg = 0;
      eggsChanged = true;

      if (getRarityIndex(egg.rarity) >= getRarityIndex("Rare")) {
        runtime.state.stats.rollsSinceLastRarePlus = 0;
      }

      if (maybeMakeShiny()) {
        egg.shiny = true;
        runtime.state.shinyCollection[egg.id] = Number(runtime.state.shinyCollection[egg.id] || 0) + 1;
        markShinyDiscovered(runtime.state, egg.id);
        shinyThisBatch = egg;
      }

      if (!runtime.state.rarestEgg || getRarityIndex(egg.rarity) > getRarityIndex(runtime.state.rarestEgg)) {
        runtime.state.rarestEgg = egg.rarity;
      }

      if (!rarestThisBatch || getRarityIndex(egg.rarity) > getRarityIndex(rarestThisBatch.rarity)) {
        rarestThisBatch = egg;
      }
    }
  }

  if (eggsChanged) {
    syncRarityTotals(runtime.state);
    checkSetCompletions();
  }

  bumpChallenge("rolls_500", count);
  runtime.state.seasonRolls = Number(runtime.state.seasonRolls || 0) + count;
  if (runtime.state.guildId) bumpGuildScore(Math.min(count, 5));

  const dieLabel = `${lastDie} (${dieInfo.label})`;
  if (runtime.el.lastRoll2) runtime.el.lastRoll2.textContent = dieLabel;
  if (isManual && runtime.el.lastRoll) runtime.el.lastRoll.textContent = dieLabel;

  if (rarestThisBatch) {
    if (runtime.el.lastEgg) {
      const shinyLabel = rarestThisBatch.shiny ? "Shiny " : "";
      runtime.el.lastEgg.innerHTML =
        `<span style="color:${rarestThisBatch.color}">${rarestThisBatch.rarity}</span> - ` +
        `${shinyLabel}${escapeHtml(rarestThisBatch.name)} (Die 2, 1 in ${formatNumber(rarestThisBatch.oneIn)})`;
    }
    if (isManual || count <= 5) {
      setFeed(
        `Die 2 found ${rarestThisBatch.shiny ? "Shiny " : ""}${rarestThisBatch.name} [${rarestThisBatch.rarity}]! Odds: 1 in ${formatNumber(rarestThisBatch.oneIn)}.`
      );
    }
    if (getRarityIndex(rarestThisBatch.rarity) >= getRarityIndex("Epic") || rarestThisBatch.shiny) {
      showRarePopup(rarestThisBatch);
      triggerRareFx();
    }
    playToneByRarity(rarestThisBatch.rarity);
  } else if (jackpotsHit > 0) {
    setFeed(`Die 2 jackpot! ${formatNumber(jackpotsHit)} roll${jackpotsHit === 1 ? "" : "s"} paid ${formatNumber(JACKPOT_COIN_MULTIPLIER)}x coins.`, "jackpot");
  } else if (isManual) {
    setFeed(`Die 2 rolled ${dieLabel}. No egg this time.`);
    playClickTone();
  }

  if (shinyThisBatch && shinyThisBatch !== rarestThisBatch) {
    showRarePopup(shinyThisBatch);
    triggerRareFx();
    setFeed(`Die 2 shiny: ${shinyThisBatch.name} [${shinyThisBatch.rarity}]!`, "shiny");
  }

  checkAchievements();
  checkRelicUnlocks();
}

export function maybeGetEgg(minRarityIndex = null, luckMult = 1) {
  if (!runtime.state) return null;
  const luckFactor = getLuckFactor() * luckMult;

  if (!Number.isFinite(luckFactor) || luckFactor <= 0) {
    return pickRandomEggForRarity(RARITIES[0].name);
  }

  for (let i = RARITIES.length - 1; i >= 0; i -= 1) {
    if (minRarityIndex !== null && i < minRarityIndex) continue;
    const rarity = RARITIES[i];
    const adjustedOneIn = Math.max(1, Math.floor(rarity.oneIn / luckFactor));
    if (randomOneIn(adjustedOneIn)) {
      return pickRandomEggForRarity(rarity.name);
    }
  }
  if (minRarityIndex !== null) {
    return pickRandomEggForRarity(RARITIES[minRarityIndex].name);
  }
  return null;
}

export function getLuckFactor() {
  if (!runtime.state) return 1;
  const luckItem = SHOP_BY_ID.luck;
  const gemLuckItem = GEM_SHOP_BY_ID.gemLuck;
  const ascDef = ASCENSION_CONFIG.upgrades.find((u) => u.id === "ascLuck");
  const ascLuck = Number(runtime.state.ascensionUpgrades.ascLuck || 0) * (ascDef?.effect || 0);
  const ppLuck = Number(runtime.state.prestigeUpgrades?.ppLuck || 0) * (PRESTIGE_SHOP_BY_ID.ppLuck?.effect || 0);
  const duelLuck = Date.now() < Number(runtime.state.duelBuffExpiresAt || 0)
    ? 0.15 + getRelicBonus("duelLuck")
    : 0;
  return (
    1 +
    Number(runtime.state.upgrades.luck || 0) * luckItem.effect +
    Number(runtime.state.gemUpgrades.gemLuck || 0) * gemLuckItem.effect +
    getSetBonusValue("luck") +
    getCompanionBonusValue("luck") +
    getGlobalEventBonus("luck") +
    ascLuck +
    duelLuck +
    Number(runtime.state.prestigeMilestoneLuck || 0) +
    getSeasonLuckBoost() +
    getRelicBonus("luck") +
    ppLuck
  );
}

export function maybeMakeShiny() {
  const shinyBoost = 1 + getRelicBonus("shiny");
  const shinyOneIn = Math.max(
    1,
    Math.floor(SHINY_BASE_ONE_IN / (Math.sqrt(Math.max(1, getLuckFactor())) * shinyBoost))
  );
  return randomOneIn(shinyOneIn);
}

function getGemLuckyEggIndex() {
  const luckyBoost = getSetBonusValue("lucky") + getGlobalEventBonus("lucky");
  const bonusTierSteps = Math.min(8, Math.floor(luckyBoost * 12) + 3);
  const epicIndex = Math.max(0, getRarityIndex("Epic"));
  return Math.max(epicIndex, epicIndex + bonusTierSteps);
}

function executeGemLuckyRoll({ rollDieFn, getDieInfoFn, cooldownKey, tagLabel, shakeEl, lastRollEl }) {
  if (!runtime.state) return;
  ensureRollStats();
  const now = Date.now();
  if (now < runtime.state[cooldownKey]) {
    const remaining = runtime.state[cooldownKey] - now;
    setFeed(`${tagLabel} cooling down: ${formatDuration(remaining)} remaining.`);
    return;
  }
  if (runtime.state.gems < LUCKY_ROLL_COST_GEMS) {
    setFeed(`${tagLabel} needs ${formatNumber(LUCKY_ROLL_COST_GEMS)} gems.`);
    return;
  }

  runtime.state.gems -= LUCKY_ROLL_COST_GEMS;
  runtime.state[cooldownKey] = now + LUCKY_ROLL_COOLDOWN_MS;

  if (Date.now() - runtime.state.lastManualRollAt > STREAK_TIMEOUT_MS) {
    runtime.state.manualStreak = 0;
  }
  runtime.state.manualStreak += 1;
  runtime.state.lastManualRollAt = now;

  const dieInfo = getDieInfoFn(runtime.state);
  const die = rollDieFn();
  const coinGain = Math.floor(
    die * getCoinMultiplier() * (1 + getManualStreakBonus()) * (dieInfo.luckMult || 1)
  );
  runtime.state.coins += coinGain;
  runtime.state.totalCoinsEarned += coinGain;
  runtime.state.totalRolls += 1;
  runtime.state.rollsSincePrestige += 1;
  runtime.state.seasonRolls = Number(runtime.state.seasonRolls || 0) + 1;
  bumpChallenge("rolls_500", 1);
  if (runtime.state.guildId) bumpGuildScore(1);

  const dieLabel = `${die} (${dieInfo.label})`;
  if (lastRollEl && runtime.el[lastRollEl]) runtime.el[lastRollEl].textContent = dieLabel;
  if (shakeEl && runtime.el[shakeEl]) {
    runtime.el[shakeEl].classList.remove("roll-shake");
    void runtime.el[shakeEl].offsetWidth;
    runtime.el[shakeEl].classList.add("roll-shake");
  }

  const forcedEgg = maybeGetEgg(getGemLuckyEggIndex(), SUPER_LUCKY_LUCK_MULT);
  if (forcedEgg) {
    const wasNew = !isEggDiscovered(runtime.state, forcedEgg.id);
    runtime.state.eggCollection[forcedEgg.id] = (runtime.state.eggCollection[forcedEgg.id] || 0) + 1;
    runtime.state.lastEggId = forcedEgg.id;
    markEggDiscovered(runtime.state, forcedEgg.id);
    if (wasNew) bumpChallenge("discover_1");
    runtime.state.stats.rollsSinceLastEgg = 0;
    runtime.state.stats.rollsSinceLastRarePlus = 0;
    if (maybeMakeShiny()) {
      forcedEgg.shiny = true;
      runtime.state.shinyCollection[forcedEgg.id] = Number(runtime.state.shinyCollection[forcedEgg.id] || 0) + 1;
      markShinyDiscovered(runtime.state, forcedEgg.id);
    }
    syncRarityTotals(runtime.state);
    checkSetCompletions();
    if (!runtime.state.rarestEgg || getRarityIndex(forcedEgg.rarity) > getRarityIndex(runtime.state.rarestEgg)) {
      runtime.state.rarestEgg = forcedEgg.rarity;
    }
    if (runtime.el.lastEgg) {
      runtime.el.lastEgg.innerHTML =
        `<span style="color:${forcedEgg.color}">${forcedEgg.rarity}</span> - ` +
        `${forcedEgg.shiny ? "Shiny " : ""}${escapeHtml(forcedEgg.name)} (${tagLabel}, 1 in ${formatNumber(forcedEgg.oneIn)})`;
    }
    setFeed(`${tagLabel} found ${forcedEgg.shiny ? "Shiny " : ""}${forcedEgg.name} [${forcedEgg.rarity}] and earned ${formatNumber(coinGain)} coins!`);
    showRarePopup(forcedEgg);
    triggerRareFx();
    playToneByRarity(forcedEgg.rarity);
    checkAchievements();
  } else {
    setFeed(`${tagLabel}: ${dieLabel}, +${formatNumber(coinGain)} coins. No egg this time.`);
    playClickTone();
  }
}

export function doLuckyRoll() {
  executeGemLuckyRoll({
    rollDieFn: rollDie,
    getDieInfoFn: getPrimaryDieInfo,
    cooldownKey: "luckyRollAvailableAt",
    tagLabel: "Lucky Roll",
    shakeEl: "luckyRollBtn",
    lastRollEl: "lastRoll"
  });
}

export function doSuperLuckyRoll() {
  if (!runtime.state) return;
  if (!hasSecondDie(runtime.state)) {
    setFeed("Unlock the second die in the Dice Shop first.");
    return;
  }
  executeGemLuckyRoll({
    rollDieFn: rollSecondDie,
    getDieInfoFn: getSecondDieInfo,
    cooldownKey: "superLuckyRollAvailableAt",
    tagLabel: "Super Lucky Roll",
    shakeEl: "superLuckyRollBtn",
    lastRollEl: "lastRoll2"
  });
}

function rollDie() {
  const sides = getDiceSides(runtime.state);
  return 1 + Math.floor(Math.random() * sides);
}

function rollSecondDie() {
  const die = getSecondDieInfo(runtime.state);
  return 1 + Math.floor(Math.random() * die.sides);
}

function randomOneIn(oneIn) {
  return Math.floor(Math.random() * oneIn) === 0;
}

export function getPrimaryRPS() {
  if (!runtime.state) return 0;
  const upgrades = runtime.state.upgrades || {};
  const gemUpgrades = runtime.state.gemUpgrades || {};
  const ascUpgrades = runtime.state.ascensionUpgrades || {};
  const ascDef = ASCENSION_CONFIG.upgrades.find((u) => u.id === "ascRps");

  const autoRps =
    Number(upgrades.auto1 || 0) * SHOP_BY_ID.auto1.effect +
    Number(upgrades.auto2 || 0) * SHOP_BY_ID.auto2.effect +
    Number(upgrades.auto3 || 0) * SHOP_BY_ID.auto3.effect +
    Number(upgrades.auto4 || 0) * SHOP_BY_ID.auto4.effect +
    Number(upgrades.auto5 || 0) * SHOP_BY_ID.auto5.effect;

  const speedBonus = 1 + Number(upgrades.fastRoll || 0) * SHOP_BY_ID.fastRoll.effect;
  const gemAutoBonus = Number(gemUpgrades.gemAuto || 0) * GEM_SHOP_BY_ID.gemAuto.effect;
  const setRps = getSetBonusValue("rps");
  const companionRps = getCompanionBonusValue("rps");
  const ascRps = Number(ascUpgrades.ascRps || 0) * (ascDef?.effect || 0);
  const total = autoRps * speedBonus + gemAutoBonus + setRps + companionRps + ascRps;
  return Number.isFinite(total) ? total : 0;
}

export function getSecondDieRPS() {
  if (!runtime.state || !hasSecondDie(runtime.state)) return 0;
  const upgrades = runtime.state.secondDieUpgrades || {};
  const upgradeRps = SECOND_DIE_RPS_ITEMS.reduce(
    (sum, item) => sum + Number(upgrades[item.id] || 0) * item.effect,
    0
  );
  const ppRps2 = Number(runtime.state.prestigeUpgrades?.ppRps2 || 0) * (PRESTIGE_SHOP_BY_ID.ppRps2?.effect || 0);
  return SECOND_DIE_BASE_RPS + upgradeRps + getRelicBonus("rps2") + ppRps2;
}

export function getTotalRPS() {
  return getPrimaryRPS() + getSecondDieRPS();
}

/** @deprecated use getTotalRPS for auto-roll throughput */
export function getCurrentRPS() {
  return getTotalRPS();
}

export function getCoinMultiplier() {
  if (!runtime.state) return 1;
  const coinMultBonus = 1 + Number(runtime.state.upgrades.coinMult || 0) * SHOP_BY_ID.coinMult.effect;
  const gemCoinBonus = 1 + Number(runtime.state.gemUpgrades.gemCoins || 0) * GEM_SHOP_BY_ID.gemCoins.effect;
  const prestigeBonus = 1 + Number(runtime.state.prestigeLevel || 0) * (0.25 + Number(runtime.state.gemUpgrades.gemPrestige || 0) * GEM_SHOP_BY_ID.gemPrestige.effect);
  const setCoin = 1 + getSetBonusValue("coins");
  const companionCoin = 1 + getCompanionBonusValue("coins");
  const eventCoin = 1 + getGlobalEventBonus("coin");
  const ascDef = ASCENSION_CONFIG.upgrades.find((u) => u.id === "ascCoins");
  const ascCoin = 1 + Number(runtime.state.ascensionUpgrades.ascCoins || 0) * (ascDef?.effect || 0);
  const relicCoin = 1 + getRelicBonus("coins");
  const guildBonus = 1 + getGuildCoinBonus();
  const mult = coinMultBonus * gemCoinBonus * prestigeBonus * setCoin * companionCoin * eventCoin * ascCoin * relicCoin * guildBonus;
  return Number.isFinite(mult) ? mult : 1;
}

export function getEggValueMultiplier() {
  if (!runtime.state) return 1;
  const coinEggValue = Number(runtime.state.upgrades?.eggValue || 0) * SHOP_BY_ID.eggValue.effect;
  const gemEggValue = Number(runtime.state.gemUpgrades?.gemValue || 0) * GEM_SHOP_BY_ID.gemValue.effect;
  const setEggValue = getSetBonusValue("eggValue");
  const companionEggValue = getCompanionBonusValue("eggValue");
  const eventEggValue = getGlobalEventBonus("eggValue");
  const mult = 1 + coinEggValue + gemEggValue + setEggValue + companionEggValue + eventEggValue;
  return Number.isFinite(mult) ? mult : 1;
}

export function getManualStreakBonus() {
  if (!runtime.state) return 0;
  const extra = getSetBonusValue("streak");
  return Math.min(STREAK_BONUS_MAX + extra, runtime.state.manualStreak * (STREAK_BONUS_STEP + extra / 10));
}
