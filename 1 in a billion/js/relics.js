import {
  ALL_EGG_BY_ID,
  EGG_TYPES,
  getCodexFoundCount,
  PRESTIGE_SHOP_BY_ID,
  RELIC_BASE_SLOTS,
  RELIC_BY_ID,
  RELIC_DEFS,
  SEASON_FEATURED_RARITIES,
  getRarityEggCount,
  hasSecondDie
} from "./config.js";
import { runtime } from "./runtime.js";
import { setFeed } from "./feedback.js";

export function getRelicMaxSlots() {
  if (!runtime.state) return RELIC_BASE_SLOTS;
  const bonus = Number(runtime.state.prestigeUpgrades?.ppRelic || 0) * (PRESTIGE_SHOP_BY_ID.ppRelic?.effect || 1);
  return RELIC_BASE_SLOTS + bonus;
}

export function getCodexPercent(state) {
  const total = EGG_TYPES.length;
  if (total <= 0) return 0;
  return (getCodexFoundCount(state) / total) * 100;
}

export function countShinies(state) {
  if (!state?.shinyCollection) return 0;
  return Object.values(state.shinyCollection).reduce((s, n) => s + Number(n || 0), 0);
}

export function isRelicUnlocked(relicId) {
  const relic = RELIC_BY_ID[relicId];
  if (!relic || !runtime.state) return false;
  if ((runtime.state.relicsUnlocked || []).includes(relicId)) return true;
  const u = relic.unlock;
  const s = runtime.state;
  switch (u.type) {
    case "codexPct":
      return getCodexPercent(s) >= u.value;
    case "seasonEgg":
      return (SEASON_FEATURED_RARITIES).some((rarity) => getRarityEggCount(s, rarity) > 0);
    case "guild":
      return !!s.guildId;
    case "shinies":
      return countShinies(s) >= u.value;
    case "prestige":
      return Number(s.prestigeLevel || 0) >= u.value;
    case "secondDie":
      return hasSecondDie(s);
    default:
      return false;
  }
}

export function checkRelicUnlocks() {
  if (!runtime.state) return;
  if (!Array.isArray(runtime.state.relicsUnlocked)) runtime.state.relicsUnlocked = [];
  RELIC_DEFS.forEach((relic) => {
    if (runtime.state.relicsUnlocked.includes(relic.id)) return;
    if (!isRelicUnlocked(relic.id)) return;
    runtime.state.relicsUnlocked.push(relic.id);
    setFeed(`Relic unlocked: ${relic.name}!`, "relic");
  });
}

export function equipRelic(relicId) {
  if (!runtime.state || !RELIC_BY_ID[relicId]) return;
  if (!runtime.state.relicsUnlocked?.includes(relicId)) return;
  if (!Array.isArray(runtime.state.relicsEquipped)) runtime.state.relicsEquipped = [];
  if (runtime.state.relicsEquipped.includes(relicId)) {
    runtime.state.relicsEquipped = runtime.state.relicsEquipped.filter((id) => id !== relicId);
    setFeed(`Unequipped ${RELIC_BY_ID[relicId].name}.`);
    return;
  }
  if (runtime.state.relicsEquipped.length >= getRelicMaxSlots()) {
    setFeed("Relic slots full. Unequip one first.");
    return;
  }
  runtime.state.relicsEquipped.push(relicId);
  setFeed(`Equipped ${RELIC_BY_ID[relicId].name}.`);
}

export function getRelicBonus(type) {
  if (!runtime.state?.relicsEquipped?.length) return 0;
  return runtime.state.relicsEquipped.reduce((sum, id) => {
    const relic = RELIC_BY_ID[id];
    if (!relic || relic.buffType !== type) return sum;
    return sum + Number(relic.buffValue || 0);
  }, 0);
}

export function formatRelicUnlockText(relic) {
  const u = relic?.unlock;
  if (!u) return "";
  switch (u.type) {
    case "codexPct":
      return `${u.value}% codex`;
    case "seasonEgg":
      return "Season egg";
    case "guild":
      return "Join a guild";
    case "shinies":
      return `${u.value} shinies`;
    case "prestige":
      return `Prestige ${u.value}`;
    case "secondDie":
      return "Own Die 2";
    default:
      return "";
  }
}
