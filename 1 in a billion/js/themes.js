import { THEME_BY_ID } from "./config.js";
import { runtime } from "./runtime.js";

export function isThemeUnlocked(state, themeId) {
  if (!state?.settings) return themeId === "classic";
  const unlocked = state.settings.unlockedThemes || ["classic"];
  return unlocked.includes(themeId);
}

export function applyTheme(settings) {
  const themeId = settings?.activeTheme || "classic";
  const safeId = THEME_BY_ID[themeId] ? themeId : "classic";
  document.body.dataset.theme = safeId;
  document.body.classList.toggle("dark", !!settings?.darkMode);
}

export function selectTheme(themeId) {
  if (!runtime.state) return false;
  if (!isThemeUnlocked(runtime.state, themeId)) return false;
  runtime.state.settings.activeTheme = themeId;
  applyTheme(runtime.state.settings);
  return true;
}
