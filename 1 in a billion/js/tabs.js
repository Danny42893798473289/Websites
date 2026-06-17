import { TAB_ORDER } from "./config.js";
import { runtime } from "./runtime.js";
import { animateTabPanels } from "./animations.js";
import { renderHeavyForTab } from "./render.js";

export function setActiveTab(tabId) {
  const el = runtime.el;
  const selected = TAB_ORDER.includes(tabId) ? tabId : "roll";
  runtime.activeTab = selected;
  el.tabButtons.forEach((btn) => {
    const isActive = btn.getAttribute("data-tab") === selected;
    btn.classList.toggle("active", isActive);
    if (isActive) {
      btn.classList.remove("tab-pop");
      void btn.offsetWidth;
      btn.classList.add("tab-pop");
    }
  });
  el.tabPanels.forEach((panel) => {
    panel.classList.toggle("hidden-panel", panel.getAttribute("data-panel") !== selected);
  });
  animateTabPanels(selected);
  if (runtime.state) {
    renderHeavyForTab(selected);
  }
}
