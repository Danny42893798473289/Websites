const express = require("express");
const http = require("http");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

// ===== DATA =====
let users = {};
if (fs.existsSync("users.json")) {
  users = JSON.parse(fs.readFileSync("users.json"));
}

let onlineUsers = {};
let socketMap = {};
/** @type {Record<string, { members: string[], createdBy: string, lastEnteredAt: number, vacatedAt: number | null }>} */
let rooms = {};

const ROOM_EMPTY_TTL_MS = 30 * 60 * 1000;
const ROOM_SWEEP_INTERVAL_MS = 60 * 1000;
const JOIN_MSG_MIN_INTERVAL_MS = 1000;

/** @type {Record<string, number>} last SYSTEM join announcement per room */
const joinAnnounceThrottle = {};

const ADMIN_USERNAME = "Admin";
/** @type {Record<string, number>} username -> kick expiry (ms since epoch) */
const kickedUntilByUser = {};

// ===== HELPERS =====
function areFriends(a, b) {
  return users[a]?.friends.includes(b);
}

function isAdminName(name) {
  return name === ADMIN_USERNAME;
}

function activeKickExpiry(username) {
  const until = kickedUntilByUser[username];
  if (!until || until <= Date.now()) {
    delete kickedUntilByUser[username];
    return 0;
  }
  return until;
}

function assertAdminSocket(socket) {
  return isAdminName(onlineUsers[socket.id]);
}

/** @param {unknown} raw minutes from client */
function clampKickMinutes(raw) {
  let m = Number(raw);
  if (!Number.isFinite(m)) m = 5;
  return Math.min(120, Math.max(1, Math.round(m)));
}

function getRoomsForClients() {
  const out = {};
  for (const [name, rec] of Object.entries(rooms)) {
    if (!rec.members?.length) continue;
    out[name] = {
      members: [...rec.members],
      createdBy: rec.createdBy,
    };
  }
  return out;
}

function broadcastRooms() {
  io.emit("rooms", getRoomsForClients());
}

async function deleteRoomAndCleanup(roomName) {
  if (!rooms[roomName]) return;
  try {
    const sockets = await io.in(roomName).fetchSockets();
    for (const s of sockets) {
      s.leave(roomName);
    }
  } catch (_) {}
  delete rooms[roomName];
  delete joinAnnounceThrottle[roomName];
  broadcastRooms();
  io.emit("roomRemoved", roomName);
}

function removeUserFromAllRoomMembers(user) {
  for (const rec of Object.values(rooms)) {
    if (!rec.members.includes(user)) continue;
    rec.members = rec.members.filter((u) => u !== user);
    if (rec.members.length === 0) {
      rec.vacatedAt = rec.vacatedAt || Date.now();
    }
  }
}

function purgeStaleEmptyRooms() {
  const now = Date.now();
  const toDelete = [];
  for (const name of Object.keys(rooms)) {
    const rec = rooms[name];
    if (rec.members.length > 0) continue;
    const vacated = rec.vacatedAt || 0;
    const staleByVacancy = now - vacated >= ROOM_EMPTY_TTL_MS;
    const staleByEnter = now - (rec.lastEnteredAt || 0) >= ROOM_EMPTY_TTL_MS;
    if (staleByVacancy || staleByEnter) {
      toDelete.push(name);
    }
  }
  for (const name of toDelete) {
    void deleteRoomAndCleanup(name);
  }
}

setInterval(() => {
  purgeStaleEmptyRooms();
}, ROOM_SWEEP_INTERVAL_MS);

// ===== AUTH =====
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (users[username]) return res.json({ success: false });

  users[username] = { password, friends: [] };
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

  res.json({ success: true });
});

app.post("/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const { password } = req.body;

  if (!username || !users[username] || users[username].password !== password) {
    return res.json({ success: false });
  }

  const kickUntil = activeKickExpiry(username);
  if (kickUntil && !isAdminName(username)) {
    return res.json({ success: false, kicked: true, until: kickUntil });
  }

  res.json({
    success: true,
    friends: users[username].friends,
  });
});

app.post("/add-friend", (req, res) => {
  const { user, friend } = req.body;

  if (!users[friend]) return res.json({ success: false });

  if (!users[user].friends.includes(friend)) {
    users[user].friends.push(friend);
    users[friend].friends.push(user);
  }

  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
  res.json({ success: true });
});

app.post("/remove-friend", (req, res) => {
  const user = String(req.body.user || "").trim();
  const friend = String(req.body.friend || "").trim();
  const { password } = req.body;

  if (!user || !friend || !users[user] || users[user].password !== password) {
    return res.json({ success: false });
  }

  if (!users[user].friends.includes(friend)) {
    return res.json({ success: false });
  }

  users[user].friends = users[user].friends.filter((x) => x !== friend);
  if (users[friend]) {
    users[friend].friends = users[friend].friends.filter((x) => x !== user);
  }

  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
  res.json({ success: true, friends: users[user].friends });
});

// ===== SOCKET =====
io.on("connection", (socket) => {
  socket.on("login", (username) => {
    if (typeof username !== "string" || !username.trim()) return;

    const name = username.trim();
    const kickUntil = activeKickExpiry(name);
    if (kickUntil && !isAdminName(name)) {
      socket.emit("kicked", { until: kickUntil });
      socket.disconnect(true);
      return;
    }

    onlineUsers[socket.id] = name;
    socketMap[name] = socket.id;

    io.emit("online", Object.values(onlineUsers));
    broadcastRooms();
  });

  socket.on("joinRoom", (room) => {
    const user = onlineUsers[socket.id];
    if (!user || typeof room !== "string") return;

    const roomName = room.trim();
    if (!roomName) return;

    for (const r of [...socket.rooms]) {
      if (r !== socket.id) socket.leave(r);
    }

    removeUserFromAllRoomMembers(user);

    let rec = rooms[roomName];
    if (!rec) {
      rec = {
        members: [],
        createdBy: user,
        lastEnteredAt: Date.now(),
        vacatedAt: null,
      };
      rooms[roomName] = rec;
    } else {
      rec.lastEnteredAt = Date.now();
      if (rec.members.length === 0 && rec.vacatedAt != null) {
        rec.vacatedAt = null;
      }
    }

    if (!rec.members.includes(user)) {
      rec.members.push(user);
    }

    socket.join(roomName);

    broadcastRooms();

    const now = Date.now();
    const lastJoinMsg = joinAnnounceThrottle[roomName] || 0;
    if (now - lastJoinMsg >= JOIN_MSG_MIN_INTERVAL_MS) {
      joinAnnounceThrottle[roomName] = now;
      io.to(roomName).emit("message", "SYSTEM", `${user} joined ${roomName}`);
    }
  });

  socket.on("deleteRoom", (room) => {
    const user = onlineUsers[socket.id];
    if (!user || typeof room !== "string") return;

    const roomName = room.trim();
    const rec = rooms[roomName];
    if (!rec) return;
    if (rec.createdBy !== user && !isAdminName(user)) return;

    void deleteRoomAndCleanup(roomName);
  });

  socket.on("chat", (msg) => {
    const user = onlineUsers[socket.id];

    const roomName = Object.keys(rooms).find((r) =>
      rooms[r].members.includes(user)
    );

    if (roomName) {
      io.to(roomName).emit("message", user, msg);
    }
  });

  // ===== VOICE (FRIENDS ONLY) =====
  socket.on("call-user", ({ target, offer }) => {
    const caller = onlineUsers[socket.id];
    if (!areFriends(caller, target)) return;

    const targetId = socketMap[target];
    if (targetId) {
      io.to(targetId).emit("incoming-call", {
        from: caller,
        offer,
      });
    }
  });

  socket.on("answer-call", ({ target, answer }) => {
    const caller = onlineUsers[socket.id];
    if (!areFriends(caller, target)) return;

    const targetId = socketMap[target];
    if (targetId) {
      io.to(targetId).emit("call-answered", answer);
    }
  });

  socket.on("ice-candidate", ({ target, candidate }) => {
    const caller = onlineUsers[socket.id];
    if (!areFriends(caller, target)) return;

    const targetId = socketMap[target];
    if (targetId) {
      io.to(targetId).emit("ice-candidate", candidate);
    }
  });

  socket.on("adminDeleteAllRooms", async () => {
    if (!assertAdminSocket(socket)) return;
    const names = Object.keys(rooms);
    for (const name of names) {
      await deleteRoomAndCleanup(name);
    }
  });

  socket.on("adminKickAll", (payload) => {
    if (!assertAdminSocket(socket)) return;

    const minutes = clampKickMinutes(payload && payload.minutes);
    const durationMs = minutes * 60 * 1000;
    const until = Date.now() + durationMs;

    for (const u of Object.keys(users)) {
      if (isAdminName(u)) continue;
      kickedUntilByUser[u] = until;
    }

    const socketIds = Object.keys(onlineUsers);
    for (const sid of socketIds) {
      const name = onlineUsers[sid];
      if (!name || isAdminName(name)) continue;
      const s = io.sockets.sockets.get(sid);
      if (s) {
        s.emit("kicked", { until, minutes });
        s.disconnect(true);
      }
    }
  });

  socket.on("adminKickUser", (payload, ack) => {
    const reply = (result) => {
      if (typeof ack === "function") ack(result);
    };

    if (!assertAdminSocket(socket)) {
      return reply({ ok: false, message: "Not authorized" });
    }

    const target = String((payload && payload.username) || "").trim();
    if (!target) {
      return reply({ ok: false, message: "Enter a username" });
    }
    if (!users[target]) {
      return reply({ ok: false, message: "Unknown user" });
    }
    if (isAdminName(target)) {
      return reply({ ok: false, message: "Cannot kick Admin" });
    }

    const minutes = clampKickMinutes(payload && payload.minutes);
    const until = Date.now() + minutes * 60 * 1000;
    kickedUntilByUser[target] = until;

    const sid = socketMap[target];
    if (sid) {
      const s = io.sockets.sockets.get(sid);
      if (s) {
        s.emit("kicked", { until, minutes });
        s.disconnect(true);
      }
    }

    reply({ ok: true, message: sid ? "User disconnected" : "User cannot sign in until kick expires" });
  });

  socket.on("adminStats", (payload, ack) => {
    const reply = (data) => {
      if (typeof ack === "function") ack(data);
    };
    if (!assertAdminSocket(socket)) {
      return reply({ ok: false, message: "Not authorized" });
    }

    const now = Date.now();
    const activeKicks = [];
    for (const [u, until] of Object.entries(kickedUntilByUser)) {
      if (until > now) activeKicks.push({ user: u, until });
      else delete kickedUntilByUser[u];
    }
    activeKicks.sort((a, b) => a.until - b.until);

    const visibleRooms = Object.keys(rooms).filter(
      (r) => rooms[r].members && rooms[r].members.length > 0
    );

    reply({
      ok: true,
      registeredCount: Object.keys(users).length,
      onlineCount: Object.keys(onlineUsers).length,
      roomCount: visibleRooms.length,
      onlineUsers: [...Object.values(onlineUsers)].sort(),
      usersList: Object.keys(users).sort(),
      activeKicks,
    });
  });

  socket.on("adminLiftKick", (payload, ack) => {
    const reply = (data) => {
      if (typeof ack === "function") ack(data);
    };
    if (!assertAdminSocket(socket)) {
      return reply({ ok: false, message: "Not authorized" });
    }
    const target = String((payload && payload.username) || "").trim();
    if (!target) {
      return reply({ ok: false, message: "Enter a username" });
    }
    if (!kickedUntilByUser[target]) {
      return reply({ ok: false, message: "No active kick for that user" });
    }
    delete kickedUntilByUser[target];
    reply({ ok: true, message: `Kick cleared for ${target}` });
  });

  socket.on("adminClearAllKicks", (_payload, ack) => {
    const reply = (data) => {
      if (typeof ack === "function") ack(data);
    };
    if (!assertAdminSocket(socket)) {
      return reply({ ok: false, message: "Not authorized" });
    }
    const n = Object.keys(kickedUntilByUser).length;
    for (const k of Object.keys(kickedUntilByUser)) {
      delete kickedUntilByUser[k];
    }
    reply({ ok: true, message: `Cleared ${n} kick record(s).` });
  });

  socket.on("adminBroadcast", (payload) => {
    if (!assertAdminSocket(socket)) return;
    const text = String((payload && payload.text) || "").trim().slice(0, 500);
    if (!text) return;
    io.emit("message", "SYSTEM", `[Broadcast] ${text}`);
  });

  socket.on("adminForceDisconnect", (payload, ack) => {
    const reply = (data) => {
      if (typeof ack === "function") ack(data);
    };
    if (!assertAdminSocket(socket)) {
      return reply({ ok: false, message: "Not authorized" });
    }
    const target = String((payload && payload.username) || "").trim();
    if (!target) {
      return reply({ ok: false, message: "Enter a username" });
    }
    if (isAdminName(target)) {
      return reply({ ok: false, message: "Cannot disconnect Admin" });
    }
    const sid = socketMap[target];
    if (!sid) {
      return reply({ ok: false, message: "User is not online" });
    }
    const s = io.sockets.sockets.get(sid);
    if (s) {
      s.emit("message", "SYSTEM", "You were disconnected by an administrator.");
      s.disconnect(true);
    }
    reply({ ok: true, message: `${target} disconnected (no login ban).` });
  });

  socket.on("disconnect", () => {
    const user = onlineUsers[socket.id];

    delete onlineUsers[socket.id];
    delete socketMap[user];

    removeUserFromAllRoomMembers(user);
    purgeStaleEmptyRooms();

    io.emit("online", Object.values(onlineUsers));
    broadcastRooms();
  });
});

server.listen(5500, () => {
  console.log("Running on http://localhost:5500");
});
