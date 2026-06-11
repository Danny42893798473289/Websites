import { DAILY_REWARD_COOLDOWN_MS } from "./config.js";
import { apiRequest } from "./api.js";
import { logEvent } from "./feedback.js";
import { runtime } from "./runtime.js";

export async function fetchGlobalEventFromServer() {
  if (!runtime.state) return;
  try {
    const data = await apiRequest("/api/event", { method: "GET" });
    if (data?.event) {
      runtime.state.currentEventData = data.event;
      runtime.state.currentEventId = data.event.id;
      runtime.state.currentEventGeneratedAt = Date.now();
      runtime.state.currentEventFetchedAt = Date.now();
    }
  } catch (err) {
    refreshGlobalEvent();
  }
}

export function refreshGlobalEvent() {
  if (!runtime.state) return;
  const now = Date.now();
  if (!runtime.state.currentEventGeneratedAt || now - runtime.state.currentEventGeneratedAt > DAILY_REWARD_COOLDOWN_MS) {
    const events = [
      { id: "eventLuck", label: "Double Luck Weekend", luck: 0.5 },
      { id: "eventCoins", label: "Coin Rush", coin: 0.35 },
      { id: "eventEggValue", label: "Gem Appraisal Fair", eggValue: 0.35 },
      { id: "eventLuckyRoll", label: "Lucky Roll Carnival", lucky: 0.4 }
    ];
    const random = events[Math.floor(Math.random() * events.length)];
    runtime.state.currentEventId = random.id;
    runtime.state.currentEventGeneratedAt = now;
    runtime.state.currentEventFetchedAt = now;
    runtime.state.currentEventData = random;
    logEvent(`Global event started: ${random.label}`, "event");
  }
}

export function getCurrentGlobalEvent() {
  if (!runtime.state) return null;
  if (!runtime.state.currentEventData || !runtime.state.currentEventId) {
    refreshGlobalEvent();
  }
  return runtime.state.currentEventData || null;
}

export function getGlobalEventBonus(type) {
  const eventData = getCurrentGlobalEvent();
  if (!eventData) return 0;
  if (type === "luck") return Number(eventData.luck || 0);
  if (type === "coin") return Number(eventData.coin || 0);
  if (type === "eggValue") return Number(eventData.eggValue || 0);
  if (type === "lucky") return Number(eventData.lucky || 0);
  return 0;
}
