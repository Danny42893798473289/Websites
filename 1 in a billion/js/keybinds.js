import { TAB_ORDER, hasSecondDie } from "./config.js";
import { runtime } from "./runtime.js";
import { setActiveTab } from "./tabs.js";
import { performRoll, performSecondRoll, doLuckyRoll, doSuperLuckyRoll } from "./rolling.js";
import { renderCore } from "./render.js";
import { save } from "./save.js";

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function onKeyDown(event) {
  if (runtime.isMobile || !runtime.state) return;
  if (isTypingTarget(document.activeElement)) return;
  if (runtime.el.tutorialOverlay && !runtime.el.tutorialOverlay.classList.contains("hidden")) return;

  const key = event.key;

  if (key === " " || key === "Spacebar") {
    event.preventDefault();
    performRoll(1, true);
    renderCore();
    save();
    return;
  }

  if (key === "2" && hasSecondDie(runtime.state)) {
    performSecondRoll(1, true);
    renderCore();
    save();
    return;
  }

  if (key === "l" || key === "L") {
    doLuckyRoll();
    renderCore();
    save();
    return;
  }

  if ((key === "s" || key === "S") && hasSecondDie(runtime.state)) {
    doSuperLuckyRoll();
    renderCore();
    save();
    return;
  }

  const tabIndex = Number(key);
  if (tabIndex >= 1 && tabIndex <= TAB_ORDER.length) {
    setActiveTab(TAB_ORDER[tabIndex - 1]);
  }
}

export function bindKeybinds() {
  unbindKeybinds();
  document.addEventListener("keydown", onKeyDown);
}

export function unbindKeybinds() {
  document.removeEventListener("keydown", onKeyDown);
}
