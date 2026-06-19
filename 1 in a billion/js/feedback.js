import { EVENT_LOG_LIMIT, getRarityIndex } from "./config.js";
import { runtime } from "./runtime.js";
import { formatNumber } from "./utils.js";
import { flashFeed, replayClass } from "./animations.js";

let popupHideTimer = null;
let popupGen = 0;

export function getPopupMinRarityIndex(state = runtime.state) {
  const setting = state?.settings?.popupMinRarity ?? "Epic";
  if (setting === "none" || setting === "off") return Number.POSITIVE_INFINITY;
  const idx = getRarityIndex(setting);
  return idx >= 0 ? idx : getRarityIndex("Epic");
}

export function shouldShowEggPopup(egg, state = runtime.state) {
  if (!egg) return false;
  if (egg.rarity === "Achievement") return true;
  if (egg.shiny) return true;
  const minIdx = getPopupMinRarityIndex(state);
  if (!Number.isFinite(minIdx)) return false;
  const eggIdx = getRarityIndex(egg.rarity);
  return eggIdx >= 0 && eggIdx >= minIdx;
}

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

export function showRarePopup(egg, { force = false } = {}) {
  const popup = runtime.el.rarePopup;
  if (!popup || !egg) return false;
  if (!force && !shouldShowEggPopup(egg)) return false;

  if (popupHideTimer) {
    clearTimeout(popupHideTimer);
    popupHideTimer = null;
  }

  const gen = ++popupGen;
  const label = egg.rarity === "Achievement" ? egg.name : `${egg.name} (${egg.rarity})`;
  popup.textContent =
    egg.rarity === "Achievement"
      ? `${label}!`
      : `${label} obtained! (1 in ${formatNumber(egg.oneIn)})`;
  popup.style.borderColor = egg.color || "#fff";
  popup.style.color =
    egg.color === "#111827" || egg.color === "#000000" || egg.color === "#ffffff" ? "#fff" : egg.color;

  popup.classList.remove("hidden", "rare-popup-burst");

  const hidePopup = () => {
    if (gen !== popupGen) return;
    popup.classList.add("hidden");
    popup.classList.remove("rare-popup-burst");
    popupHideTimer = null;
  };

  const onAnimationEnd = (event) => {
    if (event.target !== popup || event.animationName !== "rarePopupBurst") return;
    popup.removeEventListener("animationend", onAnimationEnd);
    hidePopup();
  };

  requestAnimationFrame(() => {
    if (gen !== popupGen) return;
    void popup.offsetWidth;
    popup.classList.add("rare-popup-burst");
    popup.addEventListener("animationend", onAnimationEnd);
    popupHideTimer = setTimeout(() => {
      popup.removeEventListener("animationend", onAnimationEnd);
      hidePopup();
    }, 1700);
  });

  return true;
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
