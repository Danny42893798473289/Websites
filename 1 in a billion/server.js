/* Egg Roller Idle backend server
 * - Serves static frontend files
 * - Handles login and account registration
 * - Persists all user data to users.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const { URL } = require("url");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8787);
const ROOT_DIR = __dirname;
const USERS_JS_PATH = path.join(ROOT_DIR, "users.js");
const USERS_JSON_PATH = path.join(ROOT_DIR, "data", "users.json");
const DUELS_JSON_PATH = path.join(ROOT_DIR, "data", "duels.json");
const GUILDS_JSON_PATH = path.join(ROOT_DIR, "data", "guilds.json");
const SEASONS_JSON_PATH = path.join(ROOT_DIR, "data", "seasons.json");
const BACKUP_DIR = path.join(ROOT_DIR, "data", "backups");
const RARITY_ORDER = [
  "Common", "Uncommon", "Rare", "Epic", "Legendary", "Fabled", "Mythic", "Divine",
  "Celestial", "Void", "Astral", "Ethereal", "Omnipotent", "Infinity", "Absolute", "Fusion"
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

    if (urlObj.pathname.startsWith("/api/")) {
      await handleApi(req, res, urlObj);
      return;
    }

    await serveStatic(req, res, urlObj.pathname);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, HOST, () => {
  const localUrl = `http://localhost:${PORT}`;
  console.log(`Egg Roller Idle server running at ${localUrl}`);
  if (HOST === "0.0.0.0" || HOST === "::") {
    console.log(`  (LAN: http://<your-ip>:${PORT})`);
  }
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other server (or old node process) and try again.`);
    console.error(`  PowerShell: Get-NetTCPConnection -LocalPort ${PORT} | Select OwningProcess`);
    process.exit(1);
  }
  throw err;
});

async function handleApi(req, res, urlObj) {
  const method = req.method || "GET";
  const pathname = urlObj.pathname;

  try {
    if (method === "GET" && pathname === "/api/health") {
      // Pre-warm the (potentially large) users database so first login/register is fast.
      try { readUsersFromJs(); } catch {}
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === "POST" && pathname === "/api/register") {
      const body = await readJsonBody(req);
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      const usernamePattern = /^[a-zA-Z0-9_]{3,24}$/;

      if (!usernamePattern.test(username)) {
        sendJson(res, 400, { error: "Username must be 3-24 characters (letters, numbers, underscore)." });
        return;
      }
      if (password.length < 4) {
        sendJson(res, 400, { error: "Password must be at least 4 characters." });
        return;
      }

      const usersDb = readUsersFromJs();
      if (usersDb[username]) {
        sendJson(res, 409, { error: "Username already exists." });
        return;
      }

      usersDb[username] = {
        password,
        coins: 0,
        gems: 0,
        rolls: 0,
        createdAt: Date.now(),
        save: null
      };
      writeUsersToJs(usersDb);

      sendJson(res, 200, {
        success: true,
        user: { coins: 0, gems: 0, rolls: 0 }
      });
      return;
    }

    if (method === "POST" && pathname === "/api/login") {
      const body = await readJsonBody(req);
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      const usersDb = readUsersFromJs();
      const user = usersDb[username];

      if (!user || user.password !== password) {
        sendJson(res, 401, { error: "Invalid credentials" });
        return;
      }

      sendJson(res, 200, {
        success: true,
        user: publicUserProfile(user)
      });
      return;
    }

  const leaderboardMatch = pathname.match(/^\/api\/leaderboard\/([^/]+)$/);
  if (method === "GET" && leaderboardMatch) {
    const mode = decodeURIComponent(leaderboardMatch[1]);
    const usersDb = readUsersFromJs();
    const viewer = String(urlObj.searchParams.get("viewer") || "").trim();
    const entries = Object.entries(usersDb).map(([username, user]) => buildLeaderboardEntry(username, user));
    sortLeaderboard(entries, mode);

    const top = entries.slice(0, 10);
    const viewerRank = viewer ? (entries.findIndex((entry) => entry.username === viewer) + 1 || null) : null;
    sendJson(res, 200, { leaderboard: top, viewerRank });
    return;
  }

  const profileMatch = pathname.match(/^\/api\/profile\/([^/]+)$/);
  if (method === "GET" && profileMatch) {
    const username = decodeURIComponent(profileMatch[1]);
    const usersDb = readUsersFromJs();
    const user = usersDb[username];
    if (!user) {
      sendJson(res, 404, { error: "Profile not found" });
      return;
    }
    const save = user.save || {};
    const entry = buildLeaderboardEntry(username, user);
    const shinyCollection = save.shinyCollection && typeof save.shinyCollection === "object" ? save.shinyCollection : {};
    const shinyFound = Object.values(shinyCollection).filter((count) => Number(count || 0) > 0).length;
    const shinyTotal = Object.keys(shinyCollection).length;
    sendJson(res, 200, {
      profile: {
        username,
        title: entry.title,
        rarestEgg: entry.rarestEgg,
        prestigeLevel: entry.prestigeLevel,
        ascensionLevel: Number(save.ascensionLevel || 0),
        codexFound: entry.codexFound,
        codexTotal: entry.codexTotal,
        shinyFound,
        shinyTotal,
        showcase: Array.isArray(save.showcase) ? save.showcase.slice(0, 3) : []
      }
    });
    return;
  }

  if (method === "GET" && pathname === "/api/event") {
    sendJson(res, 200, { event: getServerEvent() });
    return;
  }

  if (method === "GET" && pathname === "/api/season") {
    sendJson(res, 200, { season: getActiveSeason() });
    return;
  }

  if (method === "GET" && pathname === "/api/challenges/weekly") {
    sendJson(res, 200, { weekId: getWeekId(), tasks: getWeeklyChallengeDefs() });
    return;
  }

  if (method === "GET" && pathname === "/api/guild/leaderboard") {
    const guilds = readGuilds();
    const list = Object.values(guilds).sort((a, b) => (b.weeklyScore || 0) - (a.weeklyScore || 0)).slice(0, 10);
    sendJson(res, 200, { leaderboard: list });
    return;
  }

  const guildMatch = pathname.match(/^\/api\/guild\/([^/]+)$/);
  if (method === "GET" && guildMatch && guildMatch[1] !== "leaderboard") {
    const guildId = decodeURIComponent(guildMatch[1]);
    const guilds = readGuilds();
    const guild = guilds[guildId];
    if (!guild) {
      sendJson(res, 404, { error: "Guild not found." });
      return;
    }
    sendJson(res, 200, { guild });
    return;
  }

  if (method === "POST" && pathname === "/api/guild/create") {
    const body = await readJsonBody(req);
    const username = String(body.username || "").trim();
    const name = String(body.name || "").trim().slice(0, 24);
    const tag = String(body.tag || "").trim().toUpperCase().slice(0, 4);
    const usersDb = readUsersFromJs();
    if (!usersDb[username]) {
      sendJson(res, 404, { error: "User not found." });
      return;
    }
    if (!name || tag.length < 2) {
      sendJson(res, 400, { error: "Guild name and 2–4 letter tag required." });
      return;
    }
    const save = usersDb[username].save || {};
    if (save.guildId) {
      sendJson(res, 400, { error: "Leave your current guild first." });
      return;
    }
    const guilds = readGuilds();
    if (Object.values(guilds).some((g) => g.name.toLowerCase() === name.toLowerCase() || g.tag === tag)) {
      sendJson(res, 409, { error: "Guild name or tag already taken." });
      return;
    }
    const id = `guild_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    guilds[id] = {
      id, name, tag, leader: username,
      members: [username], createdAt: Date.now(),
      treasury: { coins: 0, gems: 0 }, weeklyScore: 0
    };
    writeGuilds(guilds);
    syncUserGuild(usersDb, username, id, "leader");
    writeUsersToJs(usersDb);
    sendJson(res, 200, { success: true, guild: guilds[id] });
    return;
  }

  if (method === "POST" && pathname === "/api/guild/join") {
    const body = await readJsonBody(req);
    const username = String(body.username || "").trim();
    const guildName = String(body.guildName || "").trim();
    const usersDb = readUsersFromJs();
    if (!usersDb[username]) {
      sendJson(res, 404, { error: "User not found." });
      return;
    }
    const save = usersDb[username].save || {};
    if (save.guildId) {
      sendJson(res, 400, { error: "Leave your current guild first." });
      return;
    }
    const guilds = readGuilds();
    const guild = Object.values(guilds).find((g) => g.name.toLowerCase() === guildName.toLowerCase());
    if (!guild) {
      sendJson(res, 404, { error: "Guild not found." });
      return;
    }
    if (guild.members.length >= 50) {
      sendJson(res, 400, { error: "Guild is full (50 members)." });
      return;
    }
    guild.members.push(username);
    writeGuilds(guilds);
    syncUserGuild(usersDb, username, guild.id, "member");
    writeUsersToJs(usersDb);
    sendJson(res, 200, { success: true, guild });
    return;
  }

  if (method === "POST" && pathname === "/api/guild/leave") {
    const body = await readJsonBody(req);
    const username = String(body.username || "").trim();
    const usersDb = readUsersFromJs();
    const save = usersDb[username]?.save || {};
    const guildId = save.guildId;
    if (!guildId) {
      sendJson(res, 400, { error: "Not in a guild." });
      return;
    }
    const guilds = readGuilds();
    const guild = guilds[guildId];
    if (guild) {
      guild.members = guild.members.filter((m) => m !== username);
      if (guild.members.length === 0) delete guilds[guildId];
      else if (guild.leader === username) guild.leader = guild.members[0];
      writeGuilds(guilds);
    }
    syncUserGuild(usersDb, username, null, null);
    writeUsersToJs(usersDb);
    sendJson(res, 200, { success: true });
    return;
  }

  if (method === "POST" && pathname === "/api/guild/contribute") {
    const body = await readJsonBody(req);
    const username = String(body.username || "").trim();
    const coins = Math.min(10_000_000, Math.max(0, Math.floor(Number(body.coins || 0))));
    const usersDb = readUsersFromJs();
    const user = usersDb[username];
    if (!user?.save?.guildId) {
      sendJson(res, 400, { error: "Not in a guild." });
      return;
    }
    if (coins <= 0 || Number(user.save.coins || 0) < coins) {
      sendJson(res, 400, { error: "Insufficient coins." });
      return;
    }
    user.save.coins = Number(user.save.coins || 0) - coins;
    syncUserSummaryFromSave(user);
    const guilds = readGuilds();
    const guild = guilds[user.save.guildId];
    if (!guild) {
      sendJson(res, 404, { error: "Guild not found." });
      return;
    }
    guild.treasury.coins = Number(guild.treasury.coins || 0) + coins;
    writeGuilds(guilds);
    usersDb[username] = user;
    writeUsersToJs(usersDb);
    sendJson(res, 200, { success: true, guild });
    return;
  }

  if (method === "POST" && pathname === "/api/guild/score") {
    const body = await readJsonBody(req);
    const username = String(body.username || "").trim();
    const amount = Math.min(1000, Math.max(1, Math.floor(Number(body.amount || 1))));
    const usersDb = readUsersFromJs();
    const guildId = usersDb[username]?.save?.guildId;
    if (!guildId) {
      sendJson(res, 400, { error: "Not in a guild." });
      return;
    }
    const guilds = readGuilds();
    const guild = guilds[guildId];
    if (guild) {
      resetGuildWeeklyIfNeeded(guild);
      guild.weeklyScore = Number(guild.weeklyScore || 0) + amount;
      writeGuilds(guilds);
    }
    sendJson(res, 200, { success: true });
    return;
  }

  if (method === "POST" && pathname === "/api/duel/challenge") {
    const body = await readJsonBody(req);
    const challenger = String(body.challenger || "").trim();
    const opponent = String(body.opponent || "").trim();
    const usersDb = readUsersFromJs();
    if (!usersDb[challenger] || !usersDb[opponent]) {
      sendJson(res, 404, { error: "Both players must exist." });
      return;
    }
    if (challenger === opponent) {
      sendJson(res, 400, { error: "You cannot duel yourself." });
      return;
    }
    const duels = readDuels();
    const active = duels.find((duel) => {
      return duel.status !== "complete" &&
        ((duel.challenger === challenger && duel.opponent === opponent) ||
          (duel.challenger === opponent && duel.opponent === challenger));
    });
    if (active) {
      sendJson(res, 409, { error: "There is already an active duel between these players." });
      return;
    }
    const duel = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      challenger,
      opponent,
      status: "active",
      createdAt: Date.now(),
      rolls: {},
      winner: null
    };
    duels.unshift(duel);
    writeDuels(duels);
    sendJson(res, 200, { success: true, duel });
    return;
  }

  if (method === "GET" && pathname === "/api/duel/active") {
    const viewer = String(urlObj.searchParams.get("viewer") || "").trim();
    const duels = readDuels().filter((duel) => duel.challenger === viewer || duel.opponent === viewer).slice(0, 10);
    sendJson(res, 200, { duels });
    return;
  }

  if (method === "POST" && pathname === "/api/duel/roll") {
    const body = await readJsonBody(req);
    const username = String(body.username || "").trim();
    const egg = body.egg && typeof body.egg === "object" ? body.egg : null;
    const duels = readDuels();
    const completedReward = duels.find((item) => item.status === "complete" && item.winner === username && !item.claimedBy?.[username]);
    if (completedReward) {
      if (!completedReward.claimedBy) completedReward.claimedBy = {};
      completedReward.claimedBy[username] = Date.now();
      writeDuels(duels);
      sendJson(res, 200, {
        success: true,
        duel: completedReward,
        reward: { gems: 75, buffExpiresAt: Date.now() + 24 * 60 * 60 * 1000 },
        message: "Duel reward claimed! You earned 75 gems and a 24h luck buff."
      });
      return;
    }
    const duel = duels.find((item) => {
      if (item.status === "complete") return false;
      const side = item.challenger === username ? "challenger" : item.opponent === username ? "opponent" : null;
      return side && !item.rolls?.[side];
    });
    if (!duel || !egg) {
      sendJson(res, 404, { error: "No active duel needs your roll." });
      return;
    }
    const side = duel.challenger === username ? "challenger" : "opponent";
    duel.rolls[side] = {
      id: String(egg.id || ""),
      name: String(egg.name || "Unknown Egg"),
      rarity: String(egg.rarity || "Common"),
      oneIn: Number(egg.oneIn || 1),
      submittedAt: Date.now()
    };
    let reward = null;
    let message = `Submitted ${duel.rolls[side].name} for your duel.`;
    if (duel.rolls.challenger && duel.rolls.opponent) {
      duel.status = "complete";
      duel.winner = pickDuelWinner(duel);
      if (duel.winner === username) {
        duel.claimedBy = { [username]: Date.now() };
        reward = { gems: 75, buffExpiresAt: Date.now() + 24 * 60 * 60 * 1000 };
        message = "Duel won! You earned 75 gems and a 24h luck buff.";
      } else if (duel.winner === "Tie") {
        reward = { gems: 25, buffExpiresAt: 0 };
        message = "Duel tied. You earned 25 gems.";
      } else {
        message = `Duel complete. ${duel.winner} won.`;
      }
    }
    writeDuels(duels);
    sendJson(res, 200, { success: true, duel, reward, message });
    return;
  }

  const saveMatch = pathname.match(/^\/api\/save\/([^/]+)$/);
  if (saveMatch) {
    const username = decodeURIComponent(saveMatch[1]);
    const usersDb = readUsersFromJs();
    const user = usersDb[username];

    if (!user) {
      sendJson(res, 404, { error: "Unknown user" });
      return;
    }

    if (method === "GET") {
      sendJson(res, 200, { state: user.save || null });
      return;
    }

    if (method === "POST") {
      const body = await readJsonBody(req);
      const incomingState = body.state;
      if (!incomingState || typeof incomingState !== "object") {
        sendJson(res, 400, { error: "Missing or invalid state" });
        return;
      }

      incomingState.lastSavedAt = Number(incomingState.lastSavedAt || Date.now());

      // Safety: never let a client push a "default/zeroed" state over a rich on-disk save.
      // This is what caused the wipe after a bad read + client boot save().
      const existing = user.save || {};
      const incRolls = Number(incomingState.totalRolls || incomingState.rolls || 0);
      const exRolls = Number(existing.totalRolls || existing.rolls || user.rolls || 0);
      const incScore = richnessScore({ save: incomingState });
      const exScore = richnessScore({ save: existing, rolls: user.rolls });

      if (incScore < exScore * 0.6 && exScore > 5000) {
        // client is sending something much poorer (e.g. after a wiped boot); keep what we have on disk
        console.warn(`[users] refusing to downgrade rich save for ${username} (client sent ~${incRolls} rolls, server has ~${exRolls}). Old data preserved.`);
        // still bump lastSavedAt / session time so the client doesn't think it failed
        existing.lastSavedAt = incomingState.lastSavedAt;
        existing.lastSessionAt = incomingState.lastSessionAt || existing.lastSessionAt;
        user.save = existing;
      } else {
        user.save = incomingState;
      }

      syncUserSummaryFromSave(user);
      usersDb[username] = user;
      writeUsersToJs(usersDb);
      sendJson(res, 200, { success: true });
      return;
    }
  }

  if (method === "POST" && pathname === "/api/admin/give-coins") {
    const body = await readJsonBody(req);
    const admin = String(body.adminUsername || "").trim();
    const target = String(body.targetUsername || "").trim();
    const amount = Number(body.amount || 0);

    const ADMINS = new Set(["Danny"]);
    const usersDb = readUsersFromJs();

    if (!ADMINS.has(admin) || !usersDb[admin]) {
      sendJson(res, 403, { error: "Admin privileges required." });
      return;
    }
    if (!target) {
      sendJson(res, 400, { error: "Target username required." });
      return;
    }

    let user = usersDb[target];
    let created = false;
    if (!user) {
      // Auto-create so Danny can grant to new friends/accounts on the fly.
      user = {
        password: "admin-granted",
        coins: 0,
        gems: 0,
        rolls: 0,
        createdAt: Date.now(),
        save: null
      };
      created = true;
    }

    const delta = Math.floor(amount); // support positive gifts or negative to deduct

    if (!user.save || typeof user.save !== "object") {
      user.save = {
        version: 1,
        username: target,
        coins: 0,
        gems: 0,
        totalRolls: 0
      };
    }
    user.save.coins = Math.max(0, Number(user.save.coins || 0) + delta);
    if (delta > 0) {
      user.save.totalCoinsEarned = Number(user.save.totalCoinsEarned || 0) + delta;
    }
    user.save.lastSavedAt = Date.now();
    syncUserSummaryFromSave(user);

    usersDb[target] = user;
    writeUsersToJs(usersDb);

    console.log(`[admin] ${admin} gave ${delta} coins to ${target}${created ? " (account auto-created with temp password 'admin-granted')" : ""}`);

    sendJson(res, 200, {
      success: true,
      created,
      target: {
        username: target,
        coins: user.coins,
        gems: Number(user.gems || 0),
        rolls: Number(user.rolls || 0)
      },
      message: created
        ? `Account "${target}" created. Gave ${delta} coins. Temp password: admin-granted (tell them to change it via Register flow or future UI).`
        : `Gave ${delta} coins to ${target}.`
    });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    console.error("API error:", err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: "Server error during request" });
    }
  }
}

function syncUserSummaryFromSave(user) {
  const save = user.save && typeof user.save === "object" ? user.save : {};
  user.coins = Number(save.coins || 0);
  user.gems = Number(save.gems || 0);
  user.rolls = Number(save.totalRolls || 0);
}

function publicUserProfile(user) {
  const save = user.save && typeof user.save === "object" ? user.save : null;
  return {
    coins: Number(save?.coins ?? user.coins ?? 0),
    gems: Number(save?.gems ?? user.gems ?? 0),
    rolls: Number(save?.totalRolls ?? user.rolls ?? 0)
  };
}

async function serveStatic(req, res, pathname) {
  if ((req.method || "GET") !== "GET") {
    sendText(res, 405, "Method Not Allowed");
    return;
  }

  const cleanPath = pathname === "/" ? "index.html" : pathname.replace(/^[/\\]+/, "");
  const safePath = path.normalize(cleanPath).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  const filePath = path.resolve(ROOT_DIR, safePath);
  const rootResolved = path.resolve(ROOT_DIR);
  const withinRoot =
    filePath === rootResolved ||
    filePath.startsWith(rootResolved + path.sep);

  if (!withinRoot) {
    sendText(res, 403, "Forbidden");
    return;
  }

  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch (err) {
    sendText(res, 404, "Not Found");
    return;
  }

  if (!stats.isFile()) {
    sendText(res, 404, "Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || "application/octet-stream";
  const buffer = fs.readFileSync(filePath);
  const headers = { "Content-Type": mime };
  if (ext === ".html" || ext === ".js" || ext === ".css" || ext === ".mjs") {
    headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
  }
  res.writeHead(200, headers);
  res.end(buffer);
}

// --- Robust user DB persistence helpers (added to prevent wipes on kill / bad snapshot) ---

async function ensureBackupDir() {
  await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
}

async function backupCurrentDb() {
  try {
    await ensureBackupDir();
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const jsBak = path.join(BACKUP_DIR, `users-${ts}.js`);
    const jsonBak = path.join(BACKUP_DIR, `users-${ts}.json`);
    let did = false;
    if (fs.existsSync(USERS_JS_PATH)) {
      await fs.promises.copyFile(USERS_JS_PATH, jsBak);
      did = true;
    }
    if (fs.existsSync(USERS_JSON_PATH)) {
      await fs.promises.copyFile(USERS_JSON_PATH, jsonBak);
      did = true;
    }
    if (did) {
      console.log(`[users] backed up previous DB to data/backups/*-${ts}.*`);
      // light prune: keep newest 6 of each
      const all = await fs.promises.readdir(BACKUP_DIR);
      const jsBaks = all.filter(f => f.endsWith(".js")).sort().reverse();
      const jsonBaks = all.filter(f => f.endsWith(".json")).sort().reverse();
      for (const old of jsBaks.slice(6)) { try { await fs.promises.unlink(path.join(BACKUP_DIR, old)); } catch {} }
      for (const old of jsonBaks.slice(6)) { try { await fs.promises.unlink(path.join(BACKUP_DIR, old)); } catch {} }
    }
  } catch (e) {
    console.warn("[users] backup skipped:", e.message);
  }
}

async function atomicWriteFile(target, content, enc = "utf8") {
  const tmp = target + ".tmp-" + process.pid + "-" + Date.now();
  await fs.promises.writeFile(tmp, content, enc);
  await fs.promises.rename(tmp, target);
}

function richnessScore(user) {
  if (!user) return 0;
  const s = user.save || {};
  const rolls = Number(user.rolls || s.totalRolls || 0);
  let collSum = 0;
  if (s.eggCollection && typeof s.eggCollection === "object") {
    for (const v of Object.values(s.eggCollection)) collSum += Number(v || 0);
  } else if (s.eggs && typeof s.eggs === "object") {
    for (const v of Object.values(s.eggs)) collSum += Number(v || 0);
  }
  const play = Number(s.playtimeMs || 0);
  return rolls * 10 + collSum + Math.floor(play / 1000);
}

function pickRicher(a, b) {
  // a, b are full users DB objects { username: userRec, ... }
  if (!a || typeof a !== "object") return b || {};
  if (!b || typeof b !== "object") return a || {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out = {};
  for (const k of keys) {
    const ua = a[k] || {};
    const ub = b[k] || {};
    out[k] = richnessScore(ua) >= richnessScore(ub) ? ua : ub;
    // also carry the better top-level numbers explicitly
    const ra = Number(ua.rolls || (ua.save && ua.save.totalRolls) || 0);
    const rb = Number(ub.rolls || (ub.save && ub.save.totalRolls) || 0);
    out[k].rolls = Math.max(ra, rb, Number(out[k].rolls || 0));
  }
  return out;
}

async function atomicBackupAndWrite(fileContent, jsonContent) {
  await backupCurrentDb();
  await fs.promises.mkdir(path.dirname(USERS_JSON_PATH), { recursive: true });
  await atomicWriteFile(USERS_JS_PATH, fileContent, "utf8");
  if (jsonContent) {
    await atomicWriteFile(USERS_JSON_PATH, jsonContent, "utf8");
  }
}

const usersCache = { data: null, at: 0 };
const USERS_CACHE_MS = 1500;

function readUsersFromJs() {
  if (usersCache.data && Date.now() - usersCache.at < USERS_CACHE_MS) {
    return usersCache.data;
  }

  let fromJson = null;
  let fromJs = null;

  try {
    if (fs.existsSync(USERS_JSON_PATH)) {
      const p = JSON.parse(fs.readFileSync(USERS_JSON_PATH, "utf8"));
      if (p && typeof p === "object") fromJson = p;
    }
  } catch (e) {
    console.warn("[users] users.json unreadable:", e.message);
  }

  try {
    const src = fs.readFileSync(USERS_JS_PATH, "utf8");
    const marker = "const users = ";
    const start = src.indexOf(marker);
    if (start !== -1) {
      const jsonStart = start + marker.length;
      const footerIdx = src.indexOf("\n// Expose", jsonStart);
      const raw = footerIdx === -1
        ? src.slice(jsonStart).trim().replace(/;\s*$/, "")
        : src.slice(jsonStart, footerIdx).trim().replace(/;\s*$/, "");
      const p = JSON.parse(raw);
      if (p && typeof p === "object") fromJs = p;
    }
  } catch (e) {
    console.warn("[users] users.js unreadable:", e.message);
  }

  let chosen = pickRicher(fromJson, fromJs);

  // If still looks wiped (Danny has basically 0 progress), try newest backups
  const d = chosen && chosen.Danny;
  const looksWiped = !chosen || Object.keys(chosen).length <= 1 ||
    (d && (d.rolls || 0) < 1000 && richnessScore(d) < 5000);

  if (looksWiped) {
    try {
      const recovered = loadRichestBackupSync();
      if (recovered) {
        console.warn("[users] current DB looks wiped — recovered richer data from backup");
        chosen = pickRicher(chosen, recovered);
        // immediately persist the good one (will also backup the bad current)
        const json = JSON.stringify(chosen, null, 2);
        const fileContent = [
          "// Account database for Egg Roller Idle.",
          "// Auto-updated by server.js on register and save.",
          "const users = " + json + ";",
          ""
        ].join("\n");
        // fire-and-forget the restore write (safe because we are in read path)
        queueUsersWrite(fileContent, json);
      }
    } catch (e) {
      console.warn("[users] backup recovery attempt failed:", e.message);
    }
  }

  if (chosen && typeof chosen === "object" && Object.keys(chosen).length > 0) {
    usersCache.data = chosen;
    usersCache.at = Date.now();
    // make sure we have a fresh JSON snapshot of whatever we chose
    try {
      fs.mkdirSync(path.dirname(USERS_JSON_PATH), { recursive: true });
      fs.writeFileSync(USERS_JSON_PATH, JSON.stringify(chosen), "utf8");
    } catch {}
    return chosen;
  }

  return usersCache.data || {};
}

function loadRichestBackupSync() {
  if (!fs.existsSync(BACKUP_DIR)) return null;
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => ({ f, p: path.join(BACKUP_DIR, f) }))
    .sort((x, y) => fs.statSync(y.p).mtimeMs - fs.statSync(x.p).mtimeMs); // newest first

  let best = null;
  let bestScore = -1;
  for (const { p } of files.slice(0, 8)) { // check a few recent
    try {
      const obj = JSON.parse(fs.readFileSync(p, "utf8"));
      if (obj && typeof obj === "object") {
        const sc = Object.values(obj).reduce((sum, u) => sum + richnessScore(u), 0);
        if (sc > bestScore) { best = obj; bestScore = sc; }
      }
    } catch {}
  }
  return best;
}

function writeUsersToJs(users) {
  usersCache.data = users;
  usersCache.at = Date.now();
  const json = JSON.stringify(users, null, 2);
  const fileContent = [
    "// Account database for Egg Roller Idle.",
    "// Auto-updated by server.js on register and save.",
    "const users = " + json + ";",
    ""
  ].join("\n");

  queueUsersWrite(fileContent, json);
}

let usersWriteQueue = Promise.resolve();

function queueUsersWrite(fileContent, jsonContent) {
  usersWriteQueue = usersWriteQueue
    .then(async () => {
      await atomicBackupAndWrite(fileContent, jsonContent);
    })
    .catch((err) => {
      console.error("Failed to write users database:", err.message);
    });
  return usersWriteQueue;
}

function buildLeaderboardEntry(username, user) {
  const save = user.save || {};
  const eggCollection = save.eggCollection && typeof save.eggCollection === "object" ? save.eggCollection : {};
  const discoveredEggs = save.discoveredEggs && typeof save.discoveredEggs === "object" ? save.discoveredEggs : {};
  const shinyCollection = save.shinyCollection && typeof save.shinyCollection === "object" ? save.shinyCollection : {};
  const codexIds = new Set([...Object.keys(eggCollection), ...Object.keys(discoveredEggs)]);
  const codexFound = Array.from(codexIds).filter((id) => discoveredEggs[id] || Number(eggCollection[id] || 0) > 0).length;
  const codexTotal = Math.max(codexIds.size, Object.keys(eggCollection).length);
  const shinies = Object.values(shinyCollection).reduce((sum, count) => sum + Number(count || 0), 0);
  const rarestEgg = String(save.rarestEgg || "None");

  return {
    username,
    title: getServerTitle(save, rarestEgg, shinies, codexFound, codexTotal),
    totalRolls: Number(save.totalRolls || user.rolls || 0),
    prestigeLevel: Number(save.prestigeLevel || 0),
    rarestEgg,
    rarestRank: RARITY_ORDER.indexOf(rarestEgg),
    shinies,
    codexFound,
    codexTotal,
    seasonRolls: Number(save.seasonRolls || 0),
    guildTag: getUserGuildTag(save.guildId)
  };
}

function sortLeaderboard(entries, mode) {
  if (mode === "rarest") {
    entries.sort((a, b) => (b.rarestRank - a.rarestRank) || (b.totalRolls - a.totalRolls));
    return;
  }
  if (mode === "shinies") {
    entries.sort((a, b) => (b.shinies - a.shinies) || (b.totalRolls - a.totalRolls));
    return;
  }
  if (mode === "codex") {
    entries.sort((a, b) => {
      const aPct = a.codexTotal > 0 ? a.codexFound / a.codexTotal : 0;
      const bPct = b.codexTotal > 0 ? b.codexFound / b.codexTotal : 0;
      return (bPct - aPct) || (b.codexFound - a.codexFound) || (b.totalRolls - a.totalRolls);
    });
    return;
  }
  if (mode === "seasonRolls") {
    entries.sort((a, b) => (b.seasonRolls - a.seasonRolls) || (b.totalRolls - a.totalRolls));
    return;
  }
  entries.sort((a, b) => b.totalRolls - a.totalRolls);
}

function getServerTitle(save, rarestEgg, shinies, codexFound, codexTotal) {
  if (save.activeTitle) return titleLabel(save.activeTitle);
  if (rarestEgg === "Absolute") return "Absolute One";
  if (rarestEgg === "Void") return "Void Walker";
  if (codexTotal > 0 && codexFound >= codexTotal) return "Codex Master";
  if (shinies >= 5) return "Shiny Collector";
  if (Number(save.totalRolls || 0) >= 1000) return "Dice Grinder";
  return "New Roller";
}

function titleLabel(titleId) {
  const labels = {
    newRoller: "New Roller",
    diceGrinder: "Dice Grinder",
    codexHunter: "Codex Hunter",
    codexMaster: "Codex Master",
    shinyCollector: "Shiny Collector",
    voidWalker: "Void Walker",
    absoluteOne: "Absolute One"
  };
  return labels[titleId] || "New Roller";
}

function readDuels() {
  try {
    if (!fs.existsSync(DUELS_JSON_PATH)) return [];
    const parsed = JSON.parse(fs.readFileSync(DUELS_JSON_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to read duels:", err.message);
    return [];
  }
}

function writeDuels(duels) {
  fs.mkdirSync(path.dirname(DUELS_JSON_PATH), { recursive: true });
  fs.writeFileSync(DUELS_JSON_PATH, JSON.stringify(duels.slice(0, 200), null, 2), "utf8");
}

function pickDuelWinner(duel) {
  const challengerRoll = duel.rolls.challenger;
  const opponentRoll = duel.rolls.opponent;
  const challengerScore = duelEggScore(challengerRoll);
  const opponentScore = duelEggScore(opponentRoll);
  if (challengerScore === opponentScore) return "Tie";
  return challengerScore > opponentScore ? duel.challenger : duel.opponent;
}

function duelEggScore(egg) {
  const rarityScore = Math.max(0, RARITY_ORDER.indexOf(String(egg?.rarity || "Common")));
  return rarityScore * 1_000_000_000_000_000 + Number(egg?.oneIn || 1);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(data);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function getServerEvent() {
  const events = [
    { id: "eventLuck", label: "Double Luck Weekend", luck: 0.5 },
    { id: "eventCoins", label: "Coin Rush", coin: 0.35 },
    { id: "eventEggValue", label: "Gem Appraisal Fair", eggValue: 0.35 },
    { id: "eventLuckyRoll", label: "Lucky Roll Carnival", lucky: 0.4 }
  ];
  const daySeed = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return events[daySeed % events.length];
}

function getWeekId(now = Date.now()) {
  return Math.floor(now / (7 * 24 * 60 * 60 * 1000));
}

function getWeeklyChallengeDefs() {
  return [
    { id: "rolls_500", target: 500 },
    { id: "fusion_3", target: 3 },
    { id: "hatch_1", target: 1 },
    { id: "discover_1", target: 1 },
    { id: "streak_10", target: 10 }
  ];
}

function readGuilds() {
  try {
    if (!fs.existsSync(GUILDS_JSON_PATH)) return {};
    return JSON.parse(fs.readFileSync(GUILDS_JSON_PATH, "utf8")) || {};
  } catch {
    return {};
  }
}

function writeGuilds(guilds) {
  fs.mkdirSync(path.dirname(GUILDS_JSON_PATH), { recursive: true });
  fs.writeFileSync(GUILDS_JSON_PATH, JSON.stringify(guilds, null, 2), "utf8");
}

function resetGuildWeeklyIfNeeded(guild) {
  const weekId = getWeekId();
  if (guild.weeklyWeekId !== weekId) {
    guild.weeklyWeekId = weekId;
    guild.weeklyScore = 0;
  }
}

function syncUserGuild(usersDb, username, guildId, role) {
  const user = usersDb[username];
  if (!user) return;
  if (!user.save) user.save = {};
  user.save.guildId = guildId;
  user.save.guildRole = role;
}

function getUserGuildTag(guildId) {
  if (!guildId) return "";
  const guild = readGuilds()[guildId];
  return guild ? guild.tag : "";
}

function getActiveSeason() {
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;
  const period = Math.floor(Date.now() / twoWeeks);
  const startAt = period * twoWeeks;
  const endAt = startAt + twoWeeks;
  const names = ["Void Festival", "Celestial Convergence", "Gem Carnival"];
  let config = null;
  try {
    if (fs.existsSync(SEASONS_JSON_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(SEASONS_JSON_PATH, "utf8"));
      config = parsed.seasons?.[period % (parsed.seasons?.length || 1)] || parsed.seasons?.[0];
    }
  } catch { /* ignore */ }
  return {
    id: config?.id || `season_${period}`,
    name: config?.name || names[period % names.length],
    startAt,
    endAt,
    bonusEggIds: config?.bonusEggIds || ["void_abyss", "void_null", "celestial_nebula"],
    luckBoost: Number(config?.luckBoost || 0.08),
    themeId: config?.themeId || "void"
  };
}
