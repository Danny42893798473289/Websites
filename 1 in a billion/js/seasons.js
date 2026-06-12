import { SEASON_EGG_IDS } from "./config.js";
import { apiRequest } from "./api.js";
import { runtime } from "./runtime.js";

export async function fetchSeasonFromServer() {
  try {
    const data = await apiRequest("/api/season", { method: "GET" });
    runtime.currentSeason = data?.season || null;
  } catch {
    runtime.currentSeason = getLocalSeason();
  }
}

function getLocalSeason() {
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;
  const period = Math.floor(Date.now() / twoWeeks);
  const names = ["Void Festival", "Celestial Convergence", "Gem Carnival"];
  return {
    id: `season_${period}`,
    name: names[period % names.length],
    bonusEggIds: SEASON_EGG_IDS,
    luckBoost: 0.08,
    endAt: (period + 1) * twoWeeks
  };
}

export function getActiveSeason() {
  return runtime.currentSeason || getLocalSeason();
}

export function isSeasonEgg(eggId) {
  const season = getActiveSeason();
  return !!(season?.bonusEggIds || SEASON_EGG_IDS).includes(eggId);
}

export function getSeasonLuckBoost() {
  const season = getActiveSeason();
  if (!season) return 0;
  const now = Date.now();
  if (season.endAt && now > season.endAt) return 0;
  if (season.startAt && now < season.startAt) return 0;
  return Number(season.luckBoost || 0);
}

export function getSeasonTimeRemaining() {
  const season = getActiveSeason();
  if (!season?.endAt) return 0;
  return Math.max(0, season.endAt - Date.now());
}
