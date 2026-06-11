const express = require("express");
const fs = require("fs");
const http = require("http");
const WebSocket = require("ws");

const app = express();

app.use(express.json());
app.use(express.static("public"));

function loadUsers() {
  if (!fs.existsSync("users.json")) return {};
  const users = JSON.parse(fs.readFileSync("users.json"));
  for (const key of Object.keys(users)) {
    const u = users[key];
    if (!Array.isArray(u.friends)) u.friends = [];
    if (!Array.isArray(u.tradeOffers)) u.tradeOffers = [];
  }
  return users;
}

function saveUsers(users) {
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
}

function hasPayloadField(data, key) {
  return data && Object.prototype.hasOwnProperty.call(data, key);
}

function pickPayloadField(data, oldData, key, fallback) {
  if (hasPayloadField(data, key)) return data[key];
  if (oldData && Object.prototype.hasOwnProperty.call(oldData, key)) return oldData[key];
  return fallback;
}

function pickBoolField(data, oldData, key, fallback = false) {
  return !!pickPayloadField(data, oldData, key, fallback);
}

function normFriendName(name) {
  return String(name || "").trim().slice(0, 64);
}

const CHAT_HISTORY_MAX = 150;
let chatHistory = [];
/** @type {Map<string, Set<import('ws')>>} */
const onlineSockets = new Map();

function broadcastJson(obj) {
  const s = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(s);
  }
}

function broadcastPresence() {
  const online = [...onlineSockets.keys()].sort();
  broadcastJson({ type: "presence", online });
}

function sendToUser(username, obj) {
  const set = onlineSockets.get(username);
  if (!set) return;
  const s = JSON.stringify(obj);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(s);
  }
}

function pushHistory(entry) {
  chatHistory.push(entry);
  if (chatHistory.length > CHAT_HISTORY_MAX) chatHistory.shift();
}

app.post("/register", (req, res) => {
  let users = loadUsers();
  const { username, password } = req.body;

  if (!username || !password) return res.json({ success: false });
  if (users[username]) return res.json({ success: false });

  users[username] = { password, data: {}, friends: [] };
  saveUsers(users);

  res.json({ success: true });
});

app.post("/login", (req, res) => {
  let users = loadUsers();
  const { username, password } = req.body;

  if (users[username] && users[username].password === password) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.post("/friends/list", (req, res) => {
  const users = loadUsers();
  const username = req.body.username;
  if (!username || !users[username]) return res.json({ friends: [], onlineFriends: [] });
  const friends = users[username].friends || [];
  const onlineFriends = friends.filter((f) => onlineSockets.has(f));
  res.json({ friends, onlineFriends });
});

app.post("/friends/add", (req, res) => {
  const users = loadUsers();
  const username = req.body.username;
  const friend = normFriendName(req.body.friend);
  if (!username || !friend || friend === username) {
    return res.json({ success: false, error: "bad_request" });
  }
  if (!users[username] || !users[friend]) {
    return res.json({ success: false, error: "no_user" });
  }
  const list = users[username].friends || [];
  if (list.includes(friend)) {
    return res.json({ success: true, friends: list });
  }
  users[username].friends = [...list, friend];
  saveUsers(users);
  res.json({ success: true, friends: users[username].friends });
});

app.post("/friends/remove", (req, res) => {
  const users = loadUsers();
  const username = req.body.username;
  const friend = normFriendName(req.body.friend);
  if (!username || !friend || !users[username]) {
    return res.json({ success: false });
  }
  users[username].friends = (users[username].friends || []).filter((f) => f !== friend);
  saveUsers(users);
  res.json({ success: true, friends: users[username].friends });
});

app.post("/save", (req, res) => {
  let users = loadUsers();
  const { username, data } = req.body;

  if (!users[username]) return res.json({ success: false });

  const oldData = users[username].data || {};

  users[username].data = {
    cookies: Number(data.cookies ?? oldData.cookies) || 0,
    grandmas: Number(data.grandmas ?? oldData.grandmas) || 0,
    farms: Number(data.farms ?? oldData.farms) || 0,
    factories: Number(data.factories ?? oldData.factories) || 0,
    oils: Number(data.oils ?? oldData.oils) || 0,
    mines: Number(data.mines ?? oldData.mines) || 0,
    coops: Number(data.coops ?? oldData.coops) || 0,
    wormholes: Number(data.wormholes ?? oldData.wormholes) || 0,
    galaxies: Number(data.galaxies ?? oldData.galaxies) || 0,
    empties: Number(data.empties ?? oldData.empties) || 0,
    pets: Array.isArray(data.pets) ? data.pets : oldData.pets || [],
    equipped: Array.isArray(data.equipped) ? data.equipped : oldData.equipped || [],
    permanentEquipped: Array.isArray(data.permanentEquipped)
      ? data.permanentEquipped
      : oldData.permanentEquipped || [],
    hatching: pickPayloadField(data, oldData, "hatching", null),
    expansionPets: Array.isArray(data.expansionPets) ? data.expansionPets : oldData.expansionPets || [],
    expansionHatching: pickPayloadField(data, oldData, "expansionHatching", null),
    marketPlots: Array.isArray(data.marketPlots) ? data.marketPlots : oldData.marketPlots || [],
    seeds: Array.isArray(data.seeds) ? data.seeds : oldData.seeds || [],
    gardenPlots: Array.isArray(data.gardenPlots) ? data.gardenPlots : oldData.gardenPlots || [],
    waterCans: Array.isArray(data.waterCans) ? data.waterCans : oldData.waterCans || [],
    produce: Array.isArray(data.produce) ? data.produce : oldData.produce || [],
    vines: Number(data.vines ?? oldData.vines) || 0,
    xp: Number(data.xp ?? oldData.xp) || 0,
    boosters: Number(data.boosters ?? oldData.boosters) || 0,
    whyEggs: Number(data.whyEggs ?? oldData.whyEggs) || 0,
    tornadoPrestige: Number(data.tornadoPrestige ?? oldData.tornadoPrestige) || 0,
    masteryPath: Object.prototype.hasOwnProperty.call(data, "masteryPath")
      ? data.masteryPath
      : oldData.masteryPath ?? null,
    masteryUnlocked: Array.isArray(data.masteryUnlocked)
      ? data.masteryUnlocked
      : oldData.masteryUnlocked || [],
    currentTheme: data.currentTheme ?? oldData.currentTheme ?? "dark-orange",
    unlockedThemes: Array.isArray(data.unlockedThemes)
      ? data.unlockedThemes
      : oldData.unlockedThemes || ["dark-orange"],
    stoneInventory:
      data.stoneInventory && typeof data.stoneInventory === "object"
        ? data.stoneInventory
        : oldData.stoneInventory || { worker: {}, pet: {} },
    appliedBuildingStones:
      data.appliedBuildingStones && typeof data.appliedBuildingStones === "object"
        ? data.appliedBuildingStones
        : oldData.appliedBuildingStones || { grandmas:0, farms:0, factories:0, oils:0, mines:0, coops:0, wormholes:0, galaxies:0, empties:0 },
    appliedPetStones: Array.isArray(data.appliedPetStones)
      ? data.appliedPetStones
      : oldData.appliedPetStones || [],
    forgeJobs: Array.isArray(data.forgeJobs)
      ? data.forgeJobs
      : data.forgeJob && typeof data.forgeJob === "object"
        ? [data.forgeJob, oldData.forgeJobs?.[1] || null]
        : oldData.forgeJobs || [null, null],
    anvilState: Array.isArray(data.anvilState)
      ? data.anvilState
      : oldData.anvilState || [
          { type: "worker", slots: [null, null] },
          { type: "worker", slots: [null, null] }
        ],
    nextCookieTickAt: Number(data.nextCookieTickAt ?? oldData.nextCookieTickAt) || 0,
    permanentSlotMeta: Array.isArray(data.permanentSlotMeta) ? data.permanentSlotMeta : oldData.permanentSlotMeta || [],
    chokeberries: Number(data.chokeberries ?? oldData.chokeberries) || 0,
    bankCard: pickPayloadField(data, oldData, "bankCard", null),
    creditCard: pickPayloadField(data, oldData, "creditCard", null),
    bankBound: pickBoolField(data, oldData, "bankBound", true),
    limbo: Number(data.limbo ?? oldData.limbo) || 0,
    yellowPrestige: Number(data.yellowPrestige ?? oldData.yellowPrestige) || 0,
    iceAgeCount: Number(data.iceAgeCount ?? oldData.iceAgeCount) || 0,
    limboRestriction: pickPayloadField(data, oldData, "limboRestriction", null),
    shopExpansionPurchases: data.shopExpansionPurchases && typeof data.shopExpansionPurchases === "object" ? data.shopExpansionPurchases : oldData.shopExpansionPurchases || {},
    raritiesRollUnlocked: pickBoolField(data, oldData, "raritiesRollUnlocked", false),
    pendingRarityMult: Number(data.pendingRarityMult ?? oldData.pendingRarityMult) || 1,
    permaMastery: pickBoolField(data, oldData, "permaMastery", false),
    iceAgeAwaitingLimbo: pickBoolField(data, oldData, "iceAgeAwaitingLimbo", false),
    tradeSlots: Number(data.tradeSlots ?? oldData.tradeSlots) || 1,
    tradeVolumeToday: Number(data.tradeVolumeToday ?? oldData.tradeVolumeToday) || 0,
    tradeVolumeDate: data.tradeVolumeDate ?? oldData.tradeVolumeDate ?? "",
    extraPermanentSlots: Number(data.extraPermanentSlots ?? oldData.extraPermanentSlots) || 0,
  };

  saveUsers(users);
  res.json({ success: true });
});

function areMutualFriends(users, a, b) {
  if (!users[a] || !users[b]) return false;
  const aF = users[a].friends || [];
  const bF = users[b].friends || [];
  return aF.includes(b) && bF.includes(a);
}

function getTradeLimit(xp) {
  return 10000 + 2500 * (Number(xp) || 0);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

app.post("/trade/list", (req, res) => {
  const users = loadUsers();
  const username = normFriendName(req.body.username);
  if (!username || !users[username]) return res.json({ offers: [] });
  const all = [];
  for (const key of Object.keys(users)) {
    for (const o of users[key].tradeOffers || []) {
      if (o.from === username || o.to === username) all.push(o);
    }
  }
  res.json({ offers: all });
});

app.post("/trade/offer", (req, res) => {
  const users = loadUsers();
  const from = normFriendName(req.body.from);
  const to = normFriendName(req.body.to);
  const give = req.body.give || {};
  const want = req.body.want || {};
  if (!from || !to || !users[from] || !users[to]) {
    return res.json({ success: false, error: "Invalid users" });
  }
  if (!areMutualFriends(users, from, to)) {
    return res.json({ success: false, error: "Must be mutual friends" });
  }
  const vol = (Number(give.cookies) || 0) + (Number(want.cookies) || 0);
  const d = users[from].data || {};
  const td = todayStr();
  let used = d.tradeVolumeDate === td ? Number(d.tradeVolumeToday) || 0 : 0;
  if (used + vol > getTradeLimit(d.xp)) {
    return res.json({ success: false, error: "Daily trade limit exceeded" });
  }
  const offer = {
    id: "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    from,
    to,
    give: { cookies: Math.max(0, Number(give.cookies) || 0) },
    want: { cookies: Math.max(0, Number(want.cookies) || 0) },
    ts: Date.now(),
  };
  if (!users[from].tradeOffers) users[from].tradeOffers = [];
  users[from].tradeOffers.push(offer);
  saveUsers(users);
  sendToUser(to, { type: "tradeOffer", offer });
  res.json({ success: true, offer });
});

app.post("/trade/accept", (req, res) => {
  const users = loadUsers();
  const username = normFriendName(req.body.username);
  const offerId = String(req.body.offerId || "");
  if (!username || !users[username] || !offerId) {
    return res.json({ success: false, error: "bad_request" });
  }
  let offer = null;
  let owner = null;
  for (const key of Object.keys(users)) {
    const list = users[key].tradeOffers || [];
    const idx = list.findIndex((o) => o.id === offerId);
    if (idx >= 0) {
      offer = list[idx];
      owner = key;
      break;
    }
  }
  if (!offer || offer.to !== username) {
    return res.json({ success: false, error: "Offer not found" });
  }
  const fromUser = users[offer.from];
  const toUser = users[offer.to];
  if (!fromUser || !toUser) return res.json({ success: false, error: "Users missing" });
  const fromData = fromUser.data || {};
  const toData = toUser.data || {};
  const giveC = Number(offer.give.cookies) || 0;
  const wantC = Number(offer.want.cookies) || 0;
  if ((Number(fromData.cookies) || 0) < giveC) {
    return res.json({ success: false, error: "Sender lacks cookies" });
  }
  if ((Number(toData.cookies) || 0) < wantC) {
    return res.json({ success: false, error: "You lack cookies to complete trade" });
  }
  fromData.cookies = (Number(fromData.cookies) || 0) - giveC + wantC;
  toData.cookies = (Number(toData.cookies) || 0) - wantC + giveC;
  const td = todayStr();
  for (const u of [fromData, toData]) {
    if (u.tradeVolumeDate !== td) {
      u.tradeVolumeDate = td;
      u.tradeVolumeToday = 0;
    }
    u.tradeVolumeToday = (Number(u.tradeVolumeToday) || 0) + giveC + wantC;
  }
  fromUser.data = fromData;
  toUser.data = toData;
  users[owner].tradeOffers = (users[owner].tradeOffers || []).filter((o) => o.id !== offerId);
  saveUsers(users);
  if (offer.from === username) {
    res.json({ success: true, data: toData });
  } else {
    res.json({ success: true, data: toData });
  }
  sendToUser(offer.from, { type: "tradeResult", offer, success: true });
  sendToUser(offer.to, { type: "tradeResult", offer, success: true });
});

app.post("/load", (req, res) => {
  let users = loadUsers();
  const { username } = req.body;
  if (!users[username]) return res.json(null);
  res.json(users[username].data || null);
});

const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: "/ws-chat" });

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      const username = normFriendName(msg.username);
      const users = loadUsers();
      if (!username || !users[username]) {
        ws.send(JSON.stringify({ type: "chatError", text: "Invalid user. Log in again." }));
        ws.close();
        return;
      }
      if (ws.chatUser && ws.chatUser !== username) {
        const prev = onlineSockets.get(ws.chatUser);
        if (prev) {
          prev.delete(ws);
          if (prev.size === 0) onlineSockets.delete(ws.chatUser);
        }
      }
      ws.chatUser = username;
      if (!onlineSockets.has(username)) onlineSockets.set(username, new Set());
      onlineSockets.get(username).add(ws);
      ws.send(JSON.stringify({ type: "history", messages: chatHistory.slice(-100) }));
      broadcastPresence();
      return;
    }

    const u = ws.chatUser;
    if (!u) return;

    if (msg.type === "chat") {
      const text = String(msg.text || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);
      if (!text) return;
      const entry = { type: "chat", from: u, text, ts: Date.now() };
      pushHistory(entry);
      broadcastJson(entry);
      return;
    }

    if (msg.type === "dm") {
      const to = normFriendName(msg.to);
      const text = String(msg.text || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);
      if (!to || !text || to === u) return;
      const users = loadUsers();
      if (!users[u] || !users[to]) return;
      const aF = users[u].friends || [];
      const bF = users[to].friends || [];
      if (!aF.includes(to) || !bF.includes(u)) {
        ws.send(
          JSON.stringify({
            type: "chatError",
            text: "You can only message mutual friends.",
          })
        );
        return;
      }
      const entry = { type: "dm", from: u, to, text, ts: Date.now() };
      sendToUser(to, entry);
      sendToUser(u, entry);
      return;
    }
  });

  ws.on("close", () => {
    if (!ws.chatUser) return;
    const set = onlineSockets.get(ws.chatUser);
    if (set) {
      set.delete(ws);
      if (set.size === 0) onlineSockets.delete(ws.chatUser);
    }
    broadcastPresence();
  });
});

server.listen(5500, () => console.log("http://localhost:5500"));
