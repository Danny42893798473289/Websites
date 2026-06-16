import {
  ALL_EGG_BY_ID,
  INCUBATOR_BASE_MS,
  INCUBATOR_BASE_SLOTS,
  INCUBATOR_RARITY_MS,
  PRESTIGE_SHOP_BY_ID,
  getRarityIndex,
  syncRarityTotals
} from "./config.js";
import { runtime } from "./runtime.js";
import { setFeed } from "./feedback.js";
import { maybeMakeShiny } from "./rolling.js";
import { markShinyDiscovered } from "./state.js";
import { getRelicBonus } from "./relics.js";

export function getIncubatorMaxSlots() {
  if (!runtime.state) return INCUBATOR_BASE_SLOTS;
  const bonus = Number(runtime.state.prestigeUpgrades?.ppIncubator || 0) * (PRESTIGE_SHOP_BY_ID.ppIncubator?.effect || 1);
  return INCUBATOR_BASE_SLOTS + bonus;
}

export function getIncubatorDurationMs(eggId) {
  const egg = ALL_EGG_BY_ID[eggId];
  if (!egg) return INCUBATOR_BASE_MS;
  const ri = egg.rarity === "Fusion" ? 14 : Math.max(0, getRarityIndex(egg.rarity));
  const base = INCUBATOR_RARITY_MS[ri] ?? INCUBATOR_RARITY_MS[INCUBATOR_RARITY_MS.length - 1];
  const ms = INCUBATOR_BASE_MS + base * 60 * 1000;
  const speed = 1 + getRelicBonus("incubatorSpeed");
  return Math.max(60_000, Math.floor(ms / speed));
}

export function sanitizeIncubator() {
  if (!runtime.state) return;
  if (!Array.isArray(runtime.state.incubator)) runtime.state.incubator = [];
  runtime.state.incubator = runtime.state.incubator.filter((slot) => slot && slot.eggId);
}

export function startIncubating(eggId) {
  if (!runtime.state || !ALL_EGG_BY_ID[eggId]) return false;
  sanitizeIncubator();
  if (runtime.state.incubator.length >= getIncubatorMaxSlots()) {
    setFeed("All incubator slots are full.");
    return false;
  }
  if (Number(runtime.state.eggCollection[eggId] || 0) < 1) {
    setFeed("You need at least 1 of that egg.");
    return false;
  }
  runtime.state.eggCollection[eggId] -= 1;
  syncRarityTotals(runtime.state);
  const durationMs = getIncubatorDurationMs(eggId);
  runtime.state.incubator.push({
    eggId,
    startedAt: Date.now(),
    durationMs
  });
  const egg = ALL_EGG_BY_ID[eggId];
  setFeed(`Incubating ${egg.name} (${Math.round(durationMs / 60000)} min).`);
  return true;
}

export function claimIncubatorSlot(index) {
  if (!runtime.state) return;
  sanitizeIncubator();
  const slot = runtime.state.incubator[index];
  if (!slot) return;
  const elapsed = Date.now() - Number(slot.startedAt || 0);
  if (elapsed < Number(slot.durationMs || 0)) {
    setFeed("Still incubating...");
    return;
  }
  const egg = ALL_EGG_BY_ID[slot.eggId];
  if (!egg) {
    runtime.state.incubator.splice(index, 1);
    return;
  }
  const gemReward = Math.max(1, Math.floor((Number(egg.gemValue) || 1) * 0.4));
  runtime.state.gems += gemReward;
  runtime.state.totalGemsEarned += gemReward;
  if (maybeMakeShiny()) {
    runtime.state.shinyCollection[slot.eggId] = Number(runtime.state.shinyCollection[slot.eggId] || 0) + 1;
    markShinyDiscovered(runtime.state, slot.eggId);
    setFeed(`Incubator hatched ${egg.name}: +${gemReward} gems and a shiny!`, "incubator");
  } else {
    setFeed(`Incubator hatched ${egg.name}: +${gemReward} gems.`, "incubator");
  }
  runtime.state.incubator.splice(index, 1);
}

export function getIncubatorProgress(slot) {
  const elapsed = Date.now() - Number(slot.startedAt || 0);
  const total = Number(slot.durationMs || 1);
  return Math.min(1, elapsed / total);
}
