import { runtime } from "./runtime.js";

/** Replay a one-shot CSS animation class on an element. */
export function replayClass(el, className) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  const cleanup = () => {
    el.classList.remove(className);
    el.removeEventListener("animationend", cleanup);
  };
  el.addEventListener("animationend", cleanup);
}

export function animateTabPanels(tabId) {
  const panels = document.querySelectorAll(
    `.tab-panel[data-panel="${tabId}"]:not(.hidden-panel)`
  );
  panels.forEach((panel, index) => {
    panel.style.setProperty("--tab-stagger", `${index * 55}ms`);
    replayClass(panel, "tab-enter");
  });
}

export function diceRollAnim(btn) {
  if (!btn) return;
  replayClass(btn, "dice-tumble");
}

export function flashRollResult(valueEl) {
  if (!valueEl) return;
  replayClass(valueEl, "roll-pop");
}

export function flashEggFound() {
  if (!runtime.el.lastEgg) return;
  replayClass(runtime.el.lastEgg, "egg-pop");
  const row = runtime.el.lastEgg.closest(".dice-display");
  if (row) replayClass(row, "egg-hit");
}

export function flashStreak() {
  if (runtime.el.streakCount) replayClass(runtime.el.streakCount, "streak-pop");
  if (runtime.el.streakBonus) replayClass(runtime.el.streakBonus, "streak-pop");
}

export function flashPurchase() {
  replayClass(document.activeElement?.closest?.(".shop-item"), "purchase-pop");
}

export function flashFeed() {
  if (runtime.el.feed) replayClass(runtime.el.feed, "feed-pop");
}

export function flashAchievement() {
  if (runtime.el.achievements) replayClass(runtime.el.achievements, "achievement-burst");
}
