import { runtime } from "./runtime.js";
import { fetchSeasonFromServer } from "./seasons.js";
import { fetchWeeklyChallenges } from "./challenges.js";
import { refreshGuild } from "./guilds.js";
import { checkRelicUnlocks } from "./relics.js";
import { populateRarityFilters, applyFiltersToUI, renderPrestigeMilestones } from "./render.js";
import { claimPrestigeMilestones } from "./economy.js";

export async function bootGameServices() {
  await fetchSeasonFromServer();
  await fetchWeeklyChallenges();
  populateRarityFilters();
  applyFiltersToUI();
  if (runtime.state) {
    claimPrestigeMilestones();
    renderPrestigeMilestones();
    checkRelicUnlocks();
  }
  await refreshGuild();
}
