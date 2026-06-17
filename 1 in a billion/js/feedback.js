import { EVENT_LOG_LIMIT } from "./config.js";
import { runtime } from "./runtime.js";
import { formatNumber } from "./utils.js";
import { flashFeed, replayClass } from "./animations.js";

export function logEvent(message, type = "info") {
  if (!runtime.state) return;
  runtime.state.eventLog.unshift({
    type,
    message,
    at: Date.now()
  });
  if (runtime.state.eventLog.length > EVENT_LOG_LIMIT) {
    runtime.state.eventLog = runtime.state.eventLog.slice(0, EVENT_LOG_LIMIT);
  }
}

export function setFeed(message, logType = "info", shouldLog = true) {
  if (!runtime.el.feed) return;
  runtime.el.feed.textContent = message;
  runtime.el.feed.className = `feed feed-bar muted feed-${logType}`;
  flashFeed();
  if (shouldLog) {
    logEvent(message, logType);
  }
}

export function showRarePopup(egg) {
  const popup = runtime.el.rarePopup;
  if (!popup || !egg) return;
  const label = `${egg.name} (${egg.rarity})`;
  popup.textContent = `${label} obtained! (1 in ${formatNumber(egg.oneIn)})`;
  popup.style.borderColor = egg.color;
  popup.style.color =
    egg.color === "#111827" || egg.color === "#000000" || egg.color === "#ffffff" ? "#fff" : egg.color;
  popup.classList.remove("hidden");
  popup.classList.remove("rare-popup-burst");
  void popup.offsetWidth;
  popup.classList.add("rare-popup-burst");
  setTimeout(() => {
    popup.classList.add("hidden");
    popup.classList.remove("rare-popup-burst");
  }, 1500);
}

export function triggerRareFx() {
  const card = runtime.el.rollingCard;
  if (!card) return;
  replayClass(card, "rare-flash");
  replayClass(card, "rare-glow");
}

export function flashJackpot() {
  if (runtime.el.coins?.closest) {
    replayClass(runtime.el.coins.closest(".currency-pill"), "jackpot-flash");
  }
}
