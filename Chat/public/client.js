const socket = io();
const username = (localStorage.getItem("user") || "").trim();
const IS_ADMIN = username === "Admin";

socket.on("kicked", (payload) => {
  const until = payload && payload.until ? new Date(payload.until) : null;
  const msg = until
    ? `You are temporarily suspended until ${until.toLocaleString()}.`
    : "You have been disconnected by an administrator.";
  alert(msg);
  window.location.href = "index.html";
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function scrollChatToBottom() {
  const el = document.getElementById("chat");
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight;
  });
}

let myFriends = [];
let peer;
let localStream;
let currentRoom = null;

// LOGIN SOCKET
socket.emit("login", username);

// ===== FRIENDS =====
async function loadFriends() {
  const res = await fetch("/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      username,
      password: localStorage.getItem("pass")
    })
  });

  const data = await res.json();
  myFriends = data.friends || [];
  renderFriends();
}

function renderFriends() {
  document.getElementById("friends").innerHTML =
    myFriends.map(f => `
      <li class="friend-row">
        <span class="friend-name" title="${escapeHtml(f)}">${escapeHtml(f)}</span>
        <span class="friend-row-actions">
          <button type="button" class="friend-call" onclick='callFriend(${JSON.stringify(f)})'>Call</button>
          <button type="button" class="friend-remove secondary" onclick='removeFriend(${JSON.stringify(f)})'>Remove</button>
        </span>
      </li>
    `).join("");
}

async function removeFriend(friend) {
  if (!friend || !confirm(`Remove "${friend}" from your friends?`)) return;
  const res = await fetch("/remove-friend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: username,
      password: localStorage.getItem("pass"),
      friend,
    }),
  });
  const data = await res.json();
  if (!data.success) {
    alert("Could not remove friend.");
    return;
  }
  await loadFriends();
}

async function addFriend() {
  const friend = (prompt("Username:") || "").trim();
  if (!friend) return;

  const res = await fetch("/add-friend", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      user: username,
      friend
    })
  });
  const data = await res.json();
  if (!data.success) {
    alert("Could not add friend.");
    return;
  }
  await loadFriends();
}

// ===== ROOMS =====
function clearChatIfRoomGone(roomsPayload) {
  if (!currentRoom) return;
  if (!roomsPayload || !roomsPayload[currentRoom]) {
    currentRoom = null;
    const chat = document.getElementById("chat");
    if (chat) chat.innerHTML = "";
  }
}

socket.on("rooms", (roomsPayload) => {
  clearChatIfRoomGone(roomsPayload);

  document.getElementById("rooms").innerHTML =
    Object.keys(roomsPayload || {}).map((r) => {
      const info = roomsPayload[r];
      const members = info.members || [];
      const isCreator = info.createdBy === username;
      const canDelete = isCreator || IS_ADMIN;
      const deleteAsAdmin = IS_ADMIN && !isCreator;
      const deleteTitle = deleteAsAdmin ? "Delete room as admin" : "Delete room";
      const deleteBtn = canDelete
        ? `<button type="button" class="room-delete" onclick='event.stopPropagation(); deleteRoom(${JSON.stringify(r)}, ${JSON.stringify(deleteAsAdmin)})' title="${escapeHtml(deleteTitle)}">Delete</button>`
        : "";
      return `
      <div class="room-card" role="button" tabindex="0" onclick='joinRoom(${JSON.stringify(r)})' onkeydown='if(event.key==="Enter"||event.key===" "){event.preventDefault();joinRoom(${JSON.stringify(r)});}'>
        <div class="room-card-top">
          <b>${escapeHtml(r)}</b>
          ${deleteBtn}
        </div>
        <span class="room-meta">${members.length} online — ${escapeHtml(members.join(", "))}</span>
      </div>`;
    }).join("");
});

socket.on("roomRemoved", (name) => {
  if (currentRoom === name) {
    currentRoom = null;
    const chat = document.getElementById("chat");
    if (chat) chat.innerHTML = "";
  }
});

// ✅ NEW: CREATE / JOIN ROOM
function createRoom() {
  const input = document.getElementById("roomInput");
  const room = input.value.trim();

  if (!room) {
    alert("Enter a room name");
    return;
  }

  socket.emit("joinRoom", room);
  currentRoom = room;
  input.value = "";
}

function joinRoom(room) {
  socket.emit("joinRoom", room);
  currentRoom = room;
}

function deleteRoom(room, asAdmin) {
  const msg = asAdmin
    ? `Delete room "${room}" as administrator? Everyone in it will be removed.`
    : `Delete room "${room}"? Everyone will be removed from it.`;
  if (!confirm(msg)) return;
  socket.emit("deleteRoom", room);
}

// ===== CHAT =====
socket.on("message", (user, msg) => {
  const self = user === username;
  const rowClass = self ? "message-row message-row--self" : "message-row";
  document.getElementById("chat").innerHTML += `
    <div class="${rowClass}">
      <div class="message-bubble">
        ${self ? "" : `<div class="message-author">${escapeHtml(user)}</div>`}
        <p class="message-text">${escapeHtml(msg)}</p>
      </div>
    </div>`;
  scrollChatToBottom();
});

function send() {
  const input = document.getElementById("msg");
  socket.emit("chat", input.value);
  input.value = "";
}

// ===== VOICE (WebRTC; tuned for mobile Safari / Chrome) =====
const RTC_CONFIGURATION = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

let pendingIncoming = null;
const iceBeforeRemote = [];
const iceBeforePeer = [];

function iceCandidatePayload(c) {
  if (!c) return null;
  return typeof c.toJSON === "function"
    ? c.toJSON()
    : {
        candidate: c.candidate,
        sdpMid: c.sdpMid,
        sdpMLineIndex: c.sdpMLineIndex,
      };
}

function resetCallMedia() {
  iceBeforeRemote.length = 0;
  iceBeforePeer.length = 0;
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  if (peer) {
    peer.onicecandidate = null;
    peer.ontrack = null;
    peer.onconnectionstatechange = null;
    peer.close();
    peer = null;
  }
  const audioEl = document.getElementById("remoteAudio");
  if (audioEl) {
    audioEl.srcObject = null;
  }
}

function flushIceBeforeRemote() {
  if (!peer || !peer.remoteDescription) return;
  const buf = iceBeforeRemote.splice(0);
  buf.forEach((c) => {
    peer.addIceCandidate(c).catch(() => {});
  });
}

function wirePeerConnection(pc) {
  pc.ontrack = (e) => {
    const audioEl = document.getElementById("remoteAudio");
    if (audioEl && e.streams[0]) {
      audioEl.srcObject = e.streams[0];
      audioEl.play().catch(() => {});
    }
  };
  pc.onicecandidate = (e) => {
    if (!e.candidate || !window.callTarget) return;
    const payload = iceCandidatePayload(e.candidate);
    if (!payload || !payload.candidate) return;
    socket.emit("ice-candidate", {
      target: window.callTarget,
      candidate: payload,
    });
  };
}

function callFriend(friend) {
  if (!friend) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    alert("Voice calls are not supported in this browser.");
    return;
  }
  resetCallMedia();
  window.callTarget = friend;

  navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .then((stream) => {
      localStream = stream;
      peer = new RTCPeerConnection(RTC_CONFIGURATION);
      wirePeerConnection(peer);
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));
      return peer.createOffer();
    })
    .then((offer) => peer.setLocalDescription(offer))
    .then(() => {
      socket.emit("call-user", {
        target: friend,
        offer: peer.localDescription,
      });
    })
    .catch((err) => {
      console.error(err);
      alert("Could not start call: " + (err && err.message ? err.message : String(err)));
      resetCallMedia();
    });
}

function showCallModal(from) {
  const modal = document.getElementById("callModal");
  const text = document.getElementById("callModalText");
  if (text) text.textContent = `${from} is calling`;
  if (modal) modal.hidden = false;
}

function hideCallModal() {
  const modal = document.getElementById("callModal");
  if (modal) modal.hidden = true;
}

function declineIncomingCall() {
  pendingIncoming = null;
  iceBeforePeer.length = 0;
  hideCallModal();
}

function acceptIncomingCall() {
  const pending = pendingIncoming;
  if (!pending) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    alert("Voice calls are not supported in this browser.");
    declineIncomingCall();
    return;
  }

  pendingIncoming = null;
  hideCallModal();

  const { from, offer } = pending;
  window.callTarget = from;
  resetCallMedia();

  navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .then((stream) => {
      localStream = stream;
      peer = new RTCPeerConnection(RTC_CONFIGURATION);
      wirePeerConnection(peer);
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));
      return peer.setRemoteDescription(offer);
    })
    .then(() => {
      const early = iceBeforePeer.splice(0);
      early.forEach((c) => {
        peer.addIceCandidate(c).catch(() => {});
      });
      flushIceBeforeRemote();
      return peer.createAnswer();
    })
    .then((answer) => peer.setLocalDescription(answer))
    .then(() => {
      socket.emit("answer-call", {
        target: from,
        answer: peer.localDescription,
      });
    })
    .catch((err) => {
      console.error(err);
      alert("Could not accept call: " + (err && err.message ? err.message : String(err)));
      resetCallMedia();
    });
}

socket.on("incoming-call", ({ from, offer }) => {
  resetCallMedia();
  pendingIncoming = { from, offer };
  showCallModal(from);
});

socket.on("call-answered", (answer) => {
  if (!peer) return;
  peer
    .setRemoteDescription(answer)
    .then(() => {
      flushIceBeforeRemote();
    })
    .catch((err) => console.error(err));
});

socket.on("ice-candidate", (candidate) => {
  if (!candidate || candidate.candidate === undefined) return;
  try {
    const c = new RTCIceCandidate(candidate);
    if (!peer) {
      iceBeforePeer.push(c);
      return;
    }
    if (!peer.remoteDescription) {
      iceBeforeRemote.push(c);
      return;
    }
    peer.addIceCandidate(c).catch(() => {});
  } catch (_) {}
});

const callAcceptBtn = document.getElementById("callAccept");
const callDeclineBtn = document.getElementById("callDecline");
if (callAcceptBtn) callAcceptBtn.addEventListener("click", acceptIncomingCall);
if (callDeclineBtn) callDeclineBtn.addEventListener("click", declineIncomingCall);

document.getElementById("msg").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

const userEl = document.getElementById("currentUserDisplay");
if (userEl && username) {
  userEl.textContent = "Signed in as " + username;
}

if (IS_ADMIN) {
  const adminPanel = document.getElementById("adminPanel");
  const adminToggle = document.getElementById("adminPanelToggle");
  const adminKickMinutes = document.getElementById("adminKickMinutes");
  const adminKickAllBtn = document.getElementById("adminKickAll");
  const adminKickUserBtn = document.getElementById("adminKickUser");
  const adminTargetUser = document.getElementById("adminTargetUser");
  const adminForceDisconnectBtn = document.getElementById("adminForceDisconnect");
  const adminLiftKickBtn = document.getElementById("adminLiftKick");
  const adminClearAllKicksBtn = document.getElementById("adminClearAllKicks");
  const adminDeleteRoomsBtn = document.getElementById("adminDeleteRooms");
  const adminStatsDisplay = document.getElementById("adminStatsDisplay");
  const adminStatsRefresh = document.getElementById("adminStatsRefresh");
  const adminBroadcastText = document.getElementById("adminBroadcastText");
  const adminBroadcastBtn = document.getElementById("adminBroadcastBtn");

  if (adminPanel) adminPanel.hidden = false;

  function formatAdminStats(res) {
    if (!res || !res.ok) return res && res.message ? String(res.message) : "Failed to load stats.";
    const lines = [
      `Registered: ${res.registeredCount}`,
      `Online now: ${res.onlineCount}`,
      `Rooms (with members): ${res.roomCount}`,
      "",
      "Online:",
      res.onlineUsers && res.onlineUsers.length ? res.onlineUsers.join(", ") : "(none)",
      "",
      "Active kicks:",
    ];
    if (res.activeKicks && res.activeKicks.length) {
      for (const k of res.activeKicks) {
        lines.push(`  ${k.user} → ${new Date(k.until).toLocaleString()}`);
      }
    } else {
      lines.push("  (none)");
    }
    lines.push("", "All accounts:");
    const list = res.usersList || [];
    const max = 40;
    lines.push(list.slice(0, max).join(", ") + (list.length > max ? ` … (+${list.length - max} more)` : ""));
    return lines.join("\n");
  }

  function refreshAdminStats() {
    socket.emit("adminStats", {}, (res) => {
      if (adminStatsDisplay) adminStatsDisplay.textContent = formatAdminStats(res);
    });
  }

  if (adminToggle && adminPanel) {
    adminToggle.addEventListener("click", () => {
      const open = adminPanel.classList.toggle("admin-panel--open");
      adminToggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) refreshAdminStats();
    });
    adminToggle.setAttribute("aria-expanded", "false");
  }

  if (adminStatsRefresh) adminStatsRefresh.addEventListener("click", () => refreshAdminStats());

  if (adminBroadcastBtn && adminBroadcastText) {
    adminBroadcastBtn.addEventListener("click", () => {
      const text = (adminBroadcastText.value || "").trim();
      if (!text) {
        alert("Enter a message to broadcast.");
        return;
      }
      if (!confirm(`Send this to everyone connected?\n\n${text}`)) return;
      socket.emit("adminBroadcast", { text });
      adminBroadcastText.value = "";
    });
  }

  function readKickMinutes() {
    let mins = parseInt(adminKickMinutes && adminKickMinutes.value, 10);
    if (!Number.isFinite(mins)) mins = 5;
    mins = Math.min(120, Math.max(1, mins));
    if (adminKickMinutes) adminKickMinutes.value = String(mins);
    return mins;
  }

  function readAdminTarget() {
    return (adminTargetUser && adminTargetUser.value || "").trim();
  }

  if (adminKickAllBtn) {
    adminKickAllBtn.addEventListener("click", () => {
      const mins = readKickMinutes();
      if (!confirm(`Kick every user (except you) for ${mins} minutes? They cannot sign in until it expires.`)) return;
      socket.emit("adminKickAll", { minutes: mins });
    });
  }

  if (adminKickUserBtn) {
    adminKickUserBtn.addEventListener("click", () => {
      const target = readAdminTarget();
      if (!target) {
        alert("Enter a username.");
        return;
      }
      const mins = readKickMinutes();
      if (!confirm(`Kick "${target}" for ${mins} minutes? They will be disconnected and cannot sign in until it expires.`)) return;
      socket.emit("adminKickUser", { username: target, minutes: mins }, (res) => {
        if (res && res.ok) {
          if (adminTargetUser) adminTargetUser.value = "";
          refreshAdminStats();
          return;
        }
        alert((res && res.message) || "Kick failed");
      });
    });
  }

  if (adminForceDisconnectBtn) {
    adminForceDisconnectBtn.addEventListener("click", () => {
      const target = readAdminTarget();
      if (!target) {
        alert("Enter a username.");
        return;
      }
      if (!confirm(`Disconnect "${target}" without a login ban?`)) return;
      socket.emit("adminForceDisconnect", { username: target }, (res) => {
        alert((res && res.message) || (res && res.ok ? "Done." : "Failed"));
        if (res && res.ok) refreshAdminStats();
      });
    });
  }

  if (adminLiftKickBtn) {
    adminLiftKickBtn.addEventListener("click", () => {
      const target = readAdminTarget();
      if (!target) {
        alert("Enter a username.");
        return;
      }
      socket.emit("adminLiftKick", { username: target }, (res) => {
        alert((res && res.message) || (res && res.ok ? "Done." : "Failed"));
        if (res && res.ok) refreshAdminStats();
      });
    });
  }

  if (adminClearAllKicksBtn) {
    adminClearAllKicksBtn.addEventListener("click", () => {
      if (!confirm("Remove all temporary login bans? Users can sign in again immediately.")) return;
      socket.emit("adminClearAllKicks", {}, (res) => {
        if (res && res.ok) {
          alert(res.message || "All kicks cleared.");
        } else {
          alert((res && res.message) || "Not allowed.");
        }
        refreshAdminStats();
      });
    });
  }

  if (adminDeleteRoomsBtn) {
    adminDeleteRoomsBtn.addEventListener("click", () => {
      if (!confirm("Delete all chat rooms? This cannot be undone.")) return;
      socket.emit("adminDeleteAllRooms");
    });
  }
}

// INIT
loadFriends();