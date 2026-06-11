(function(){
  let ws = null;
  let reconnectTimer = null;
  let chatOpen = false;
  let presenceOnline = [];
  let friendsList = [];
  let dmPeer = null;

  function $(id){ return document.getElementById(id); }

  function chatWsUrl(){
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/ws-chat`;
  }

  function disconnectChat(){
    if (reconnectTimer){
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws){
      ws.onclose = null;
      ws.close();
      ws = null;
    }
  }

  function fmtTime(ts){
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function appendGlobalLine(from, text, ts, kind){
    const box = $("chatGlobalFeed");
    if (!box) return;
    const row = document.createElement("div");
    const body = document.createElement("div");
    body.className = "chat-msg__body";
    body.textContent = text;
    if (kind === "system"){
      row.className = "chat-msg chat-msg--system";
      row.appendChild(body);
    } else {
      row.className = "chat-msg";
      const meta = document.createElement("span");
      meta.className = "chat-msg__meta";
      meta.textContent = `${from} · ${fmtTime(ts)}`;
      row.appendChild(meta);
      row.appendChild(body);
    }
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }

  function appendDmLine(from, text, ts){
    const box = $("chatDmFeed");
    if (!box) return;
    const row = document.createElement("div");
    row.className = "chat-msg";
    const meta = document.createElement("span");
    meta.className = "chat-msg__meta";
    const self = typeof currentUser !== "undefined" ? currentUser : "";
    meta.textContent = (from === self ? "You" : from) + " · " + fmtTime(ts);
    const body = document.createElement("div");
    body.className = "chat-msg__body";
    body.textContent = text;
    row.appendChild(meta);
    row.appendChild(body);
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }

  function setConnStatus(text){
    const el = $("chatConnStatus");
    if (el) el.textContent = text;
  }

  function renderPresence(){
    const el = $("chatOnlineList");
    if (!el) return;
    el.innerHTML = "";
    const self = typeof currentUser !== "undefined" ? currentUser : "";
    presenceOnline.filter((n) => n !== self).forEach((name) => {
      const chip = document.createElement("span");
      chip.className = "chat-chip";
      chip.innerHTML =
        '<span class="chat-dot"></span>' +
        '<span>' +
        name.replace(/</g, "") +
        "</span>";
      el.appendChild(chip);
    });
    if (!presenceOnline.filter((n) => n !== self).length){
      const empty = document.createElement("span");
      empty.className = "small";
      empty.textContent = "No other players online.";
      el.appendChild(empty);
    }
  }

  function renderFriends(){
    const box = $("chatFriendsList");
    if (!box) return;
    box.innerHTML = "";
    const onlineSet = new Set(presenceOnline);
    if (!friendsList.length){
      const p = document.createElement("p");
      p.className = "small";
      p.style.margin = "0";
      p.textContent = "No friends yet. Add someone who plays.";
      box.appendChild(p);
      return;
    }
    friendsList.forEach((name) => {
      const row = document.createElement("div");
      row.className = "chat-friend-row";
      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.gap = "8px";
      const dot = document.createElement("span");
      dot.className = "chat-dot" + (onlineSet.has(name) ? "" : " chat-dot--off");
      const nm = document.createElement("span");
      nm.textContent = name;
      left.appendChild(dot);
      left.appendChild(nm);
      const actions = document.createElement("div");
      actions.className = "chat-friend-actions";
      const msgBtn = document.createElement("button");
      msgBtn.type = "button";
      msgBtn.className = "ghost";
      msgBtn.textContent = "Message";
      msgBtn.onclick = () => openDm(name);
      const rmBtn = document.createElement("button");
      rmBtn.type = "button";
      rmBtn.className = "ghost";
      rmBtn.textContent = "Remove";
      rmBtn.onclick = () => removeFriend(name);
      actions.appendChild(msgBtn);
      actions.appendChild(rmBtn);
      row.appendChild(left);
      row.appendChild(actions);
      box.appendChild(row);
    });
  }

  function setTab(tab){
    const gBtn = $("chatTabGlobal");
    const fBtn = $("chatTabFriends");
    const gPanel = $("chatPanelGlobal");
    const fPanel = $("chatPanelFriends");
    if (!gBtn || !fBtn || !gPanel || !fPanel) return;
    const isG = tab === "global";
    gBtn.classList.toggle("chat-tab--active", isG);
    fBtn.classList.toggle("chat-tab--active", !isG);
    gPanel.style.display = isG ? "flex" : "none";
    fPanel.style.display = isG ? "none" : "flex";
    if (!isG) refreshFriends();
  }

  function openDm(peer){
    dmPeer = peer;
    const banner = $("chatDmPeer");
    const section = $("chatDmSection");
    if (banner) banner.textContent = peer;
    if (section) section.style.display = "flex";
    const feed = $("chatDmFeed");
    if (feed) feed.innerHTML = "";
    setTab("friends");
  }

  async function refreshFriends(){
    const u = typeof currentUser !== "undefined" ? currentUser : "";
    if (!u) return;
    try{
      const r = await fetch("/friends/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u }),
      });
      const d = await r.json();
      friendsList = Array.isArray(d.friends) ? d.friends : [];
      renderFriends();
    } catch{
      renderFriends();
    }
  }

  async function addFriend(){
    const input = $("chatFriendInput");
    const name = input && input.value ? input.value.trim() : "";
    if (!name) return;
    const u = typeof currentUser !== "undefined" ? currentUser : "";
    if (!u) return;
    try{
      const r = await fetch("/friends/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, friend: name }),
      });
      const d = await r.json();
      if (!d.success){
        alert(d.error === "no_user" ? "That player is not registered." : "Could not add friend.");
        return;
      }
      if (input) input.value = "";
      friendsList = d.friends || [];
      renderFriends();
    } catch{
      alert("Network error.");
    }
  }

  async function removeFriend(name){
    const u = typeof currentUser !== "undefined" ? currentUser : "";
    if (!u) return;
    if (!confirm(`Remove ${name} from friends?`)) return;
    try{
      const r = await fetch("/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, friend: name }),
      });
      const d = await r.json();
      friendsList = d.friends || [];
      if (dmPeer === name){
        dmPeer = null;
        const section = $("chatDmSection");
        if (section) section.style.display = "none";
      }
      renderFriends();
    } catch{
      alert("Network error.");
    }
  }

  function sendGlobal(){
    const input = $("chatGlobalInput");
    const text = input && input.value ? input.value.trim() : "";
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "chat", text }));
    if (input) input.value = "";
  }

  function sendDm(){
    const input = $("chatDmInput");
    const text = input && input.value ? input.value.trim() : "";
    if (!text || !dmPeer || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "dm", to: dmPeer, text }));
    if (input) input.value = "";
  }

  function handleMessage(ev){
    let data;
    try{
      data = JSON.parse(ev.data);
    } catch{
      return;
    }
    if (data.type === "history"){
      const box = $("chatGlobalFeed");
      if (box) box.innerHTML = "";
      (data.messages || []).forEach((m) => {
        if (m.type === "chat") appendGlobalLine(m.from, m.text, m.ts);
      });
      return;
    }
    if (data.type === "presence"){
      presenceOnline = data.online || [];
      renderPresence();
      renderFriends();
      return;
    }
    if (data.type === "chat"){
      appendGlobalLine(data.from, data.text, data.ts);
      return;
    }
    if (data.type === "dm"){
      const self = typeof currentUser !== "undefined" ? currentUser : "";
      if (
        dmPeer &&
        ((data.from === dmPeer && data.to === self) || (data.from === self && data.to === dmPeer))
      ){
        appendDmLine(data.from, data.text, data.ts);
      }
      return;
    }
    if (data.type === "chatError"){
      appendGlobalLine("", data.text || "Error", Date.now(), "system");
    }
  }

  function connectChat(){
    disconnectChat();
    const u = typeof currentUser !== "undefined" ? currentUser : "";
    if (!u) return;
    setConnStatus("Connecting…");
    try{
      ws = new WebSocket(chatWsUrl());
    } catch{
      setConnStatus("Disconnected");
      scheduleReconnect();
      return;
    }
    ws.onopen = () => {
      setConnStatus("Connected");
      ws.send(JSON.stringify({ type: "join", username: u }));
    };
    ws.onmessage = handleMessage;
    ws.onclose = () => {
      setConnStatus("Disconnected — retrying…");
      ws = null;
      scheduleReconnect();
    };
    ws.onerror = () => {};
  }

  function scheduleReconnect(){
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      const u = typeof currentUser !== "undefined" ? currentUser : "";
      const fab = $("chatFab");
      if (u && fab && fab.style.display !== "none") connectChat();
    }, 2500);
  }

  function toggleChat(){
    const dock = $("chatDock");
    const fab = $("chatFab");
    if (!dock) return;
    chatOpen = !chatOpen;
    dock.classList.toggle("chat-dock--open", chatOpen);
    dock.setAttribute("aria-hidden", chatOpen ? "false" : "true");
    if (fab) fab.setAttribute("aria-expanded", chatOpen ? "true" : "false");
    if (chatOpen){
      refreshFriends();
      setTimeout(() => {
        const inp = $("chatGlobalInput");
        if (inp && dock.classList.contains("chat-dock--open")) inp.focus();
      }, 50);
    }
  }

  window.initChatSession = function(){
    const fab = $("chatFab");
    if (fab) fab.style.display = "inline-flex";
    connectChat();
  };

  window.endChatSession = function(){
    const fab = $("chatFab");
    if (fab) fab.style.display = "none";
    const dock = $("chatDock");
    if (dock){
      dock.classList.remove("chat-dock--open");
      dock.setAttribute("aria-hidden", "true");
    }
    chatOpen = false;
    disconnectChat();
    setConnStatus("");
  };

  window.initChatUi = function(){
    const fab = $("chatFab");
    const closeBtn = $("chatCloseBtn");
    if (fab) fab.addEventListener("click", toggleChat);
    if (closeBtn) closeBtn.addEventListener("click", toggleChat);
    $("chatTabGlobal")?.addEventListener("click", () => setTab("global"));
    $("chatTabFriends")?.addEventListener("click", () => setTab("friends"));
    $("chatGlobalSend")?.addEventListener("click", sendGlobal);
    $("chatGlobalInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey){
        e.preventDefault();
        sendGlobal();
      }
    });
    $("chatFriendAddBtn")?.addEventListener("click", addFriend);
    $("chatFriendInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter"){
        e.preventDefault();
        addFriend();
      }
    });
    $("chatDmSend")?.addEventListener("click", sendDm);
    $("chatDmInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey){
        e.preventDefault();
        sendDm();
      }
    });
  };
})();
