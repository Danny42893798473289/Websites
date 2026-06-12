import { apiLogin, apiRegister } from "./api.js";
import { runtime } from "./runtime.js";
import { mergeSaveWithDefaultsFast, save, syncRemoteSaveIfNewer } from "./save.js";
import { applyOfflineProgress } from "./rolling.js";
import { fetchGlobalEventFromServer, refreshGlobalEvent } from "./events.js";
import { renderCore, renderHeavyForTab } from "./render.js";
import { setFeed } from "./feedback.js";
import { startLoops, stopLoops } from "./loops.js";
import { refreshLeaderboard, updateAdminVisibility } from "./social.js";
import { checkSetCompletions } from "./progression.js";
import { checkAchievements } from "./economy.js";
import { applyTheme } from "./themes.js";
import { applyStaticUI, applyLanguage, setLang } from "./i18n.js";

function yieldToBrowser(ms = 50) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function onRegisterSubmit() {
  const el = runtime.el;
  if (!el || !el.username || !el.password) {
    showLoginError("Register form not ready. Refresh the page.");
    return;
  }
  const username = (el.username.value || "").trim();
  const password = el.password.value || "";
  clearLoginError();

  if (username.length < 3 || password.length < 4) {
    showLoginError("Username must be 3+ chars and password 4+ chars.");
    return;
  }

  const submitBtn = el.loginForm?.querySelector('[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  try {
    const response = await apiRegister(username, password);
    runtime.backendAvailable = true;
    await loginAs(username, response.user || { coins: 0, gems: 0, rolls: 0 });
    setFeed(`Registered and logged in as ${username}.`);
  } catch (err) {
    showLoginError(err.message || "Registration failed.");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

export async function onLoginSubmit(event) {
  event.preventDefault();
  const el = runtime.el;
  if (!el || !el.username || !el.password) {
    showLoginError("Login form not ready. Refresh the page.");
    console.error("Login elements missing", el);
    return;
  }
  const username = (el.username.value || "").trim();
  const password = el.password.value || "";
  clearLoginError();

  const submitBtn = el.loginForm?.querySelector('[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  setLoginError("Logging in…");

  try {
    const backendRes = await apiLogin(username, password);
    runtime.backendAvailable = true;
    await loginAs(username, backendRes.user || { coins: 0, gems: 0, rolls: 0 });
  } catch (apiErr) {
    runtime.backendAvailable = false;
    const userRecord = localLogin(username, password);
    if (!userRecord) {
      showLoginError(apiErr.message || "Invalid username or password.");
      return;
    }
    try {
      await loginAs(username, userRecord);
    } catch (err) {
      showLoginError(err.message || "Login failed. Please refresh and try again.");
      console.error("Login error:", err);
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

export function showLoginError(message) {
  runtime.el.loginError.textContent = message;
  runtime.el.loginError.classList.remove("hidden");
}

export function clearLoginError() {
  runtime.el.loginError.textContent = "";
  runtime.el.loginError.classList.add("hidden");
}

function setLoginError(message) {
  showLoginError(message);
}

export function localLogin(username, password) {
  const usersDb = window.USERS;
  if (!usersDb) return null;
  const user = usersDb[username];
  if (!user || user.password !== password) {
    return null;
  }
  const save = user.save && typeof user.save === "object" ? user.save : null;
  return {
    coins: Number(save?.coins ?? user.coins ?? 0),
    gems: Number(save?.gems ?? user.gems ?? 0),
    rolls: Number(save?.totalRolls ?? user.rolls ?? 0)
  };
}

export async function loginAs(username, userRecord) {
  runtime.loginBootPhase = true;
  runtime.pendingOfflineRolls = 0;
  runtime.currentUser = username;
  updateAdminVisibility();
  runtime.state = mergeSaveWithDefaultsFast(username, userRecord);
  if (runtime.state.settings?.language) setLang(runtime.state.settings.language);

  const el = runtime.el;
  el.loginPanel.classList.add("hidden");
  el.gameRoot.classList.remove("hidden");
  applyTheme(runtime.state.settings);
  runtime.previousCoins = runtime.state.coins;
  runtime.previousGems = runtime.state.gems;
  clearLoginError();
  applyStaticUI();
  setFeed("Logged in! Loading your save…");
  renderCore();

  await yieldToBrowser(runtime.isMobile ? 80 : 30);

  try {
    await syncRemoteSaveIfNewer(username, userRecord);
    checkSetCompletions();
    checkAchievements();
    refreshGlobalEvent();
    renderCore();
    await applyOfflineProgress({ loginBoot: true });
    renderCore();
    renderHeavyForTab(runtime.activeTab || "roll");
    applyLanguage();
    startLoops();
    void refreshLeaderboard();
    void fetchGlobalEventFromServer();
    setFeed(`Welcome back, ${username}!`);
    setTimeout(() => save(), 250);
  } catch (err) {
    console.error("Post-login boot failed:", err);
    startLoops();
    setFeed("Logged in, but some progress is still loading.");
  } finally {
    runtime.loginBootPhase = false;
  }
}

export function onLogout() {
  save();
  stopLoops();
  runtime.currentUser = null;
  runtime.state = null;
  runtime.pendingOfflineRolls = 0;
  updateAdminVisibility();
  runtime.el.gameRoot.classList.add("hidden");
  runtime.el.loginPanel.classList.remove("hidden");
  runtime.el.password.value = "";
  setFeed("Logged out.");
}

export function onToggleDarkMode() {
  if (!runtime.state) return;
  runtime.state.settings.darkMode = !!runtime.el.darkModeToggle.checked;
  applyTheme(runtime.state.settings);
  save();
}
