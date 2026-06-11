import { apiRequest } from "./api.js";
import { ALL_EGG_BY_ID } from "./config.js";
import { runtime } from "./runtime.js";
import { escapeHtml, formatNumber } from "./utils.js";
import { maybeGetEgg } from "./rolling.js";
import { setFeed } from "./feedback.js";
import { save } from "./save.js";
import { renderCore } from "./render.js";

export async function refreshLeaderboard() {
  if (!runtime.currentUser) return;
  try {
    const mode = runtime.el.leaderboardMode?.value || "totalRolls";
    const data = await apiRequest(`/api/leaderboard/${encodeURIComponent(mode)}?viewer=${encodeURIComponent(runtime.currentUser)}`, { method: "GET" });
    const rows = (data.leaderboard || []).map((entry, index) => {
      const metric = formatLeaderboardMetric(entry, mode);
      return `
          <div class="leader-item">
            <div class="shop-item-top">
              <strong>#${index + 1} ${escapeHtml(entry.username)} <span class="shiny-pill">${escapeHtml(entry.title || "New Roller")}</span></strong>
              <span>${metric}</span>
            </div>
            <div class="muted">Rarest: ${escapeHtml(entry.rarestEgg || "None")} | Prestige: ${formatNumber(entry.prestigeLevel || 0)} | Shinies: ${formatNumber(entry.shinies || 0)}</div>
          </div>
        `;
    }).join("");
    runtime.el.leaderboardList.innerHTML = rows || "<div class='muted'>No leaderboard data yet.</div>";
    runtime.el.leaderboardRank.textContent = data.viewerRank ? `Rank: #${data.viewerRank}` : "Rank: -";
  } catch (err) {
    runtime.el.leaderboardList.innerHTML = "<div class='muted'>Leaderboard unavailable.</div>";
    runtime.el.leaderboardRank.textContent = "Rank: -";
  }
}

function formatLeaderboardMetric(entry, mode) {
  if (mode === "rarest") return `${escapeHtml(entry.rarestEgg || "None")} rarity`;
  if (mode === "shinies") return `${formatNumber(entry.shinies || 0)} shinies`;
  if (mode === "codex") return `${formatNumber(entry.codexFound || 0)} / ${formatNumber(entry.codexTotal || 0)} codex`;
  return `${formatNumber(entry.totalRolls || 0)} rolls`;
}

export async function lookupProfile() {
  const username = (runtime.el.profileLookupInput.value || "").trim();
  if (!username) return;
  try {
    const data = await apiRequest(`/api/profile/${encodeURIComponent(username)}`, { method: "GET" });
    const p = data.profile;
    if (!p) {
      runtime.el.profileCard.innerHTML = "<div class='muted'>Player not found.</div>";
      return;
    }
    runtime.el.profileCard.innerHTML = `
        <div>Username <span>${escapeHtml(p.username)}</span></div>
        <div>Title <span>${escapeHtml(p.title || "New Roller")}</span></div>
        <div>Rarest Egg <span>${escapeHtml(p.rarestEgg || "None")}</span></div>
        <div>Prestige Level <span>${formatNumber(p.prestigeLevel || 0)}</span></div>
        <div>Ascension Level <span>${formatNumber(p.ascensionLevel || 0)}</span></div>
        <div>Codex Completion <span>${formatNumber(p.codexFound || 0)} / ${formatNumber(p.codexTotal || 0)}</span></div>
        <div>Shiny Codex <span>${formatNumber(p.shinyFound || 0)} / ${formatNumber(p.shinyTotal || 0)}</span></div>
        <div>Showcase <span>${renderProfileShowcase(p.showcase || [])}</span></div>
      `;
  } catch (err) {
    runtime.el.profileCard.innerHTML = "<div class='muted'>Could not fetch profile.</div>";
  }
}

function renderProfileShowcase(showcase) {
  const items = showcase.map((item) => {
    const egg = ALL_EGG_BY_ID[item.eggId];
    if (!egg) return "";
    return `${item.shiny ? "Shiny " : ""}${escapeHtml(egg.name)}`;
  }).filter(Boolean);
  return items.length ? items.join(" | ") : "None pinned";
}

export async function challengeDuel() {
  const opponent = (runtime.el.duelUsernameInput.value || "").trim();
  if (!runtime.currentUser || !opponent) return;
  try {
    await apiRequest("/api/duel/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenger: runtime.currentUser, opponent })
    });
    setFeed(`Duel challenge sent to ${opponent}.`, "duel");
    await refreshDuels();
  } catch (err) {
    setFeed(err.message || "Could not create duel.", "duel");
  }
}

export async function refreshDuels() {
  if (!runtime.currentUser) return;
  try {
    const data = await apiRequest(`/api/duel/active?viewer=${encodeURIComponent(runtime.currentUser)}`, { method: "GET" });
    renderDuels(data.duels || []);
  } catch (err) {
    runtime.el.duelPanel.innerHTML = "<div class='muted'>Duels unavailable.</div>";
  }
}

export async function submitDuelRoll() {
  if (!runtime.currentUser) return;
  const egg = maybeGetEgg(0);
  if (!egg) return;
  try {
    const data = await apiRequest("/api/duel/roll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: runtime.currentUser, egg })
    });
    if (data.reward) {
      runtime.state.gems += Number(data.reward.gems || 0);
      runtime.state.totalGemsEarned += Number(data.reward.gems || 0);
      runtime.state.duelBuffExpiresAt = Math.max(Number(runtime.state.duelBuffExpiresAt || 0), Number(data.reward.buffExpiresAt || 0));
      save();
    }
    setFeed(data.message || `Submitted ${egg.name} for your duel.`, "duel");
    await refreshDuels();
  } catch (err) {
    setFeed(err.message || "No duel needs your roll right now.", "duel");
  }
}

function renderDuels(duels) {
  if (!runtime.el.duelPanel) return;
  runtime.el.duelPanel.innerHTML = duels.map((duel) => {
    const you = duel.challenger === runtime.currentUser ? "challenger" : "opponent";
    const other = you === "challenger" ? duel.opponent : duel.challenger;
    const yourRoll = duel.rolls?.[you];
    const otherRoll = duel.rolls?.[you === "challenger" ? "opponent" : "challenger"];
    return `
        <div class="leader-item">
          <div class="shop-item-top">
            <strong>${escapeHtml(duel.status)} vs ${escapeHtml(other)}</strong>
            <span>${duel.winner ? `Winner: ${escapeHtml(duel.winner)}` : "Pending"}</span>
          </div>
          <div class="muted">Your roll: ${formatDuelEgg(yourRoll)} | Their roll: ${formatDuelEgg(otherRoll)}</div>
        </div>
      `;
  }).join("") || "<div class='muted'>No active duels yet.</div>";
}

function formatDuelEgg(egg) {
  if (!egg) return "not submitted";
  return `${escapeHtml(egg.name)} [${escapeHtml(egg.rarity)}]`;
}

export function updateAdminVisibility() {
  const isDanny = runtime.currentUser === "Danny";
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.classList.toggle("danny-admin", isDanny);
  });
}

export async function giveAdminCoins() {
  if (runtime.currentUser !== "Danny") {
    setFeed("Admin tools are only available when logged in as Danny.", "error");
    return;
  }
  const target = (runtime.el.adminTargetUsername?.value || "").trim();
  const amtStr = runtime.el.adminCoinAmount?.value || "";
  const amount = Number(amtStr);
  if (!target) {
    if (runtime.el.adminGrantResult) runtime.el.adminGrantResult.textContent = "Enter a target username.";
    return;
  }
  if (!Number.isFinite(amount)) {
    if (runtime.el.adminGrantResult) runtime.el.adminGrantResult.textContent = "Enter a valid coin amount.";
    return;
  }

  const originalText = runtime.el.adminGiveCoinsBtn ? runtime.el.adminGiveCoinsBtn.textContent : "";
  if (runtime.el.adminGiveCoinsBtn) runtime.el.adminGiveCoinsBtn.disabled = true;
  if (runtime.el.adminGrantResult) runtime.el.adminGrantResult.textContent = "Processing...";

  try {
    const res = await apiRequest("/api/admin/give-coins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminUsername: runtime.currentUser,
        targetUsername: target,
        amount
      })
    });

    const msg = res.message || `Gave ${amount} coins to ${target}.`;
    setFeed(msg);
    if (runtime.el.adminGrantResult) {
      runtime.el.adminGrantResult.textContent = msg + (res.created ? " (new account auto-created)" : "");
    }

    // If we granted to the currently logged-in player, immediately reflect it in the UI
    if (target === runtime.currentUser && runtime.state) {
      runtime.state.coins = Number(res.target?.coins ?? (Number(runtime.state.coins || 0) + amount));
      // keep top-level counters sane
      runtime.state.totalCoinsEarned = Math.max(
        Number(runtime.state.totalCoinsEarned || 0),
        Number(runtime.state.coins || 0)
      );
      renderCore();
      save();
    }
  } catch (err) {
    const m = err.message || "Failed to grant coins (server error or not admin).";
    setFeed(m, "error");
    if (runtime.el.adminGrantResult) runtime.el.adminGrantResult.textContent = m;
  } finally {
    if (runtime.el.adminGiveCoinsBtn) {
      runtime.el.adminGiveCoinsBtn.disabled = false;
      runtime.el.adminGiveCoinsBtn.textContent = originalText || "Give Coins";
    }
  }
}
