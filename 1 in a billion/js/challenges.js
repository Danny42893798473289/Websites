import { WEEKLY_CHALLENGE_TEMPLATES } from "./config.js";
import { runtime } from "./runtime.js";
import { apiRequest } from "./api.js";
import { setFeed } from "./feedback.js";
import { save } from "./save.js";
import { getWeekId } from "./utils.js";
import { t } from "./i18n.js";

export function ensureWeeklyChallenges() {
  if (!runtime.state) return;
  const weekId = getWeekId();
  if (runtime.state.weeklyChallenges.weekId !== weekId) {
    runtime.state.weeklyChallenges = { weekId, tasks: {} };
    WEEKLY_CHALLENGE_TEMPLATES.forEach((tpl) => {
      runtime.state.weeklyChallenges.tasks[tpl.id] = { progress: 0, claimed: false };
    });
  }
}

export async function fetchWeeklyChallenges() {
  try {
    const data = await apiRequest("/api/challenges/weekly", { method: "GET" });
    if (data?.weekId) runtime.weeklyChallengeWeekId = data.weekId;
  } catch {
    /* offline ok */
  }
  ensureWeeklyChallenges();
}

export function bumpChallenge(id, amount = 1) {
  if (!runtime.state) return;
  ensureWeeklyChallenges();
  const task = runtime.state.weeklyChallenges.tasks[id];
  if (!task || task.claimed) return;
  const tpl = WEEKLY_CHALLENGE_TEMPLATES.find((t) => t.id === id);
  if (!tpl) return;
  task.progress = Math.min(tpl.target, Number(task.progress || 0) + amount);
}

export function claimChallenge(id) {
  if (!runtime.state) return false;
  ensureWeeklyChallenges();
  const task = runtime.state.weeklyChallenges.tasks[id];
  const tpl = WEEKLY_CHALLENGE_TEMPLATES.find((t) => t.id === id);
  if (!task || !tpl || task.claimed || task.progress < tpl.target) return false;
  task.claimed = true;
  runtime.state.gems += tpl.rewardGems;
  runtime.state.totalGemsEarned += tpl.rewardGems;
  if (tpl.rewardCoins) {
    runtime.state.coins += tpl.rewardCoins;
    runtime.state.totalCoinsEarned += tpl.rewardCoins;
  }
  setFeed(t("challenge.claimed", { gems: tpl.rewardGems }), "challenge");
  save();
  return true;
}

export function getChallengeLabel(id) {
  return t(`challenge.${id}`);
}
