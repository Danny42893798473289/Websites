import { TAB_ORDER } from "./config.js";
import { runtime } from "./runtime.js";
import { renderHeavyForTab } from "./render.js";

export function setActiveTab(tabId) {
  const el = runtime.el;
  const selected = TAB_ORDER.includes(tabId) ? tabId : "roll";
  runtime.activeTab = selected;
  el.tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === selected);
  });
  el.tabPanels.forEach((panel) => {
    panel.classList.toggle("hidden-panel", panel.getAttribute("data-panel") !== selected);
  });
  if (runtime.state) {
    renderHeavyForTab(selected);
  }
}
