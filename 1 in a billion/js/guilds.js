import { apiRequest } from "./api.js";
import { runtime } from "./runtime.js";
import { escapeHtml, formatNumber } from "./utils.js";
import { setFeed } from "./feedback.js";
import { save } from "./save.js";
import { t } from "./i18n.js";

export async function refreshGuild() {
  if (!runtime.currentUser || !runtime.el.guildPanel) return;
  try {
    if (runtime.state?.guildId) {
      const data = await apiRequest(`/api/guild/${encodeURIComponent(runtime.state.guildId)}`, { method: "GET" });
      renderGuildPanel(data.guild);
    } else {
      renderGuildPanel(null);
    }
  } catch {
    runtime.el.guildPanel.innerHTML = `<div class="muted">${t("guild.unavailable")}</div>`;
  }
}

export async function createGuild() {
  const name = (runtime.el.guildNameInput?.value || "").trim();
  const tag = (runtime.el.guildTagInput?.value || "").trim().toUpperCase();
  if (!name || !tag) return;
  try {
    const data = await apiRequest("/api/guild/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: runtime.currentUser, name, tag })
    });
    if (data.guild) {
      runtime.state.guildId = data.guild.id;
      runtime.state.guildRole = "leader";
      setFeed(t("guild.created", { name: data.guild.name }), "guild");
      save();
      await refreshGuild();
    }
  } catch (err) {
    setFeed(err.message || t("guild.createFailed"), "guild");
  }
}

export async function joinGuild() {
  const name = (runtime.el.guildJoinInput?.value || "").trim();
  if (!name) return;
  try {
    const data = await apiRequest("/api/guild/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: runtime.currentUser, guildName: name })
    });
    if (data.guild) {
      runtime.state.guildId = data.guild.id;
      runtime.state.guildRole = "member";
      setFeed(t("guild.joined", { name: data.guild.name }), "guild");
      save();
      await refreshGuild();
    }
  } catch (err) {
    setFeed(err.message || t("guild.joinFailed"), "guild");
  }
}

export async function leaveGuild() {
  if (!runtime.state?.guildId) return;
  try {
    await apiRequest("/api/guild/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: runtime.currentUser })
    });
    runtime.state.guildId = null;
    runtime.state.guildRole = null;
    setFeed(t("guild.left"), "guild");
    save();
    await refreshGuild();
  } catch (err) {
    setFeed(err.message || t("guild.leaveFailed"), "guild");
  }
}

export async function contributeToGuild() {
  const coins = Number(runtime.el.guildContribCoins?.value || 0);
  if (!runtime.state?.guildId || coins <= 0 || runtime.state.coins < coins) return;
  try {
    const data = await apiRequest("/api/guild/contribute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: runtime.currentUser, coins })
    });
    runtime.state.coins -= coins;
    setFeed(t("guild.contributed", { n: formatNumber(coins) }), "guild");
    save();
    renderGuildPanel(data.guild);
  } catch (err) {
    setFeed(err.message || t("guild.contribFailed"), "guild");
  }
}

function renderGuildPanel(guild) {
  if (!runtime.el.guildPanel) return;
  runtime.guildTreasury = guild?.treasury?.coins || 0;
  if (!guild) {
    runtime.el.guildPanel.innerHTML = `
      <div class="settings-row">
        <input id="guild-name-input" type="text" placeholder="${escapeHtml(t("guild.namePh"))}" />
        <input id="guild-tag-input" type="text" maxlength="4" placeholder="${escapeHtml(t("guild.tagPh"))}" style="width:70px" />
        <button id="guild-create-btn">${t("guild.create")}</button>
      </div>
      <div class="settings-row">
        <input id="guild-join-input" type="text" placeholder="${escapeHtml(t("guild.joinPh"))}" />
        <button id="guild-join-btn">${t("guild.join")}</button>
      </div>`;
    cacheGuildInputs();
    bindGuildPanelEvents();
    return;
  }
  const members = (guild.members || []).map((m) => escapeHtml(m)).join(", ");
  runtime.el.guildPanel.innerHTML = `
    <div class="codex-title">
      <strong>[${escapeHtml(guild.tag)}] ${escapeHtml(guild.name)}</strong>
      <span class="codex-status">${formatNumber(guild.members?.length || 0)} ${t("guild.members")}</span>
    </div>
    <div class="muted">${t("guild.leader")}: ${escapeHtml(guild.leader || "?")}</div>
    <div class="muted">${t("guild.treasury")}: ${formatNumber(guild.treasury?.coins || 0)} ${t("ui.coins").replace(":", "")}</div>
    <div class="muted">${t("guild.perk")}: +${Math.min(10, Math.floor((guild.treasury?.coins || 0) / 10000))}% ${t("guild.coinGain")}</div>
    <div class="muted">${t("guild.weeklyScore")}: ${formatNumber(guild.weeklyScore || 0)}</div>
    <div class="muted">${members}</div>
    <div class="settings-row">
      <input id="guild-contrib-coins" type="number" min="1" step="1000" value="10000" style="width:120px" />
      <button id="guild-contrib-btn">${t("guild.contribute")}</button>
      <button id="guild-leave-btn" class="small danger">${t("guild.leave")}</button>
    </div>
    <div id="guild-leaderboard-list" class="shop-list"></div>`;
  cacheGuildInputs();
  bindGuildPanelEvents();
  refreshGuildLeaderboard();
}

function cacheGuildInputs() {
  runtime.el.guildNameInput = document.getElementById("guild-name-input");
  runtime.el.guildTagInput = document.getElementById("guild-tag-input");
  runtime.el.guildJoinInput = document.getElementById("guild-join-input");
  runtime.el.guildContribCoins = document.getElementById("guild-contrib-coins");
}

function bindGuildPanelEvents() {
  document.getElementById("guild-create-btn")?.addEventListener("click", createGuild);
  document.getElementById("guild-join-btn")?.addEventListener("click", joinGuild);
  document.getElementById("guild-leave-btn")?.addEventListener("click", leaveGuild);
  document.getElementById("guild-contrib-btn")?.addEventListener("click", contributeToGuild);
}

async function refreshGuildLeaderboard() {
  const el = document.getElementById("guild-leaderboard-list");
  if (!el) return;
  try {
    const data = await apiRequest("/api/guild/leaderboard", { method: "GET" });
    el.innerHTML = (data.leaderboard || []).map((g, i) =>
      `<div class="leader-item"><strong>#${i + 1} [${escapeHtml(g.tag)}] ${escapeHtml(g.name)}</strong> <span>${formatNumber(g.weeklyScore || 0)}</span></div>`
    ).join("") || `<div class="muted">${t("guild.lbEmpty")}</div>`;
  } catch {
    el.innerHTML = `<div class="muted">${t("guild.lbEmpty")}</div>`;
  }
}

export function getGuildCoinBonus() {
  /* Applied client-side from cached guild treasury if needed; server validates on contribute */
  return 0;
}

export async function bumpGuildScore(amount = 1) {
  if (!runtime.state?.guildId || !runtime.currentUser) return;
  try {
    await apiRequest("/api/guild/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: runtime.currentUser, amount })
    });
  } catch { /* ignore */ }
}
