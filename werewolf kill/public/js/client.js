const isWerewolfRouted = /^\/werewolf(?:\/|$)/.test(location.pathname);
const socketPath = isWerewolfRouted ? '/werewolf/socket.io' : '/socket.io';
const socket = io(location.origin, {
  reconnection: true,
  path: socketPath,
  transports: ['websocket', 'polling'],
});
const SESSION_KEY = 'werewolf-session';

const $ = (sel) => document.querySelector(sel);

function saveSession({ roomCode, playerId, playerName }) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ roomCode, playerId, playerName })
  );
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

const screens = {
  join: $('#screen-join'),
  lobby: $('#screen-lobby'),
  game: $('#screen-game'),
};

let myPlayerId = null;
let myRole = null;
let lastState = null;
let seerResults = [];
let chatKnownIds = new Set();
let timerInterval = null;

let lobbyChat = null;
let gameChat = null;

const PHASE_LABELS = {
  lobby: 'Lobby',
  night_werewolf: 'Night — Werewolves',
  night_seer: 'Night — Seer',
  night_witch: 'Night — Witch',
  day_announce: 'Day',
  day_last_words: 'Last words',
  day_discussion: 'Discussion',
  day_vote: 'Vote',
  day_tie_speak: 'Tiebreaker',
  day_tie_vote: 'Revote',
  game_over: 'Game over',
};

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove('active'));
  screens[name]?.classList.add('active');
}

function showError(el, msg) {
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function createChatUI(mountEl) {
  const tpl = $('#chat-template');
  const node = tpl.content.cloneNode(true);
  mountEl.innerHTML = '';
  mountEl.appendChild(node);
  const panel = mountEl.querySelector('.chat-panel');
  return {
    panel,
    hint: panel.querySelector('.chat-hint'),
    timer: panel.querySelector('.discussion-timer'),
    messages: panel.querySelector('.chat-messages'),
    form: panel.querySelector('.chat-form'),
    input: panel.querySelector('.chat-input'),
  };
}

function formatTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function channelLabel(ch) {
  if (ch === 'wolf') return '🐺 pack';
  if (ch === 'last_words') return '⚰ last words';
  if (ch === 'lobby') return 'lobby';
  return '';
}

function renderChatMessages(chatUi, messages, { reset = false } = {}) {
  if (!chatUi) return;
  if (reset) {
    chatKnownIds.clear();
    chatUi.messages.innerHTML = '';
  }
  for (const m of messages || []) {
    if (chatKnownIds.has(m.id)) continue;
    chatKnownIds.add(m.id);
    const ch = channelLabel(m.channel);
    const el = document.createElement('div');
    el.className = `chat-msg${m.playerId === myPlayerId ? ' own' : ''}`;
    el.dataset.id = m.id;
    el.innerHTML = `
      <span class="chat-meta">${escapeHtml(m.playerName)}${ch ? ` · ${ch}` : ''}</span>
      <span class="chat-text">${escapeHtml(m.text)}</span>
    `;
    chatUi.messages.appendChild(el);
  }
  chatUi.messages.scrollTop = chatUi.messages.scrollHeight;
}

function appendChatMessage(chatUi, m) {
  if (!chatUi || chatKnownIds.has(m.id)) return;
  renderChatMessages(chatUi, [m]);
}

function updateChatUI(chatUi, state) {
  if (!chatUi || !state) return;
  chatUi.hint.textContent = state.chatHint || 'Chat';
  const canChat = state.canChat;
  chatUi.input.disabled = !canChat;
  chatUi.input.placeholder = canChat ? 'Type a message…' : state.chatHint || 'Chat closed';
  chatUi.form.querySelector('button').disabled = !canChat;

  const actionEnd = state.me?.actionDeadlineAt;
  if (state.discussionEndsAt) {
    chatUi.timer.classList.remove('hidden');
    chatUi.timer.textContent = formatTime(state.discussionEndsAt - Date.now());
  } else if (actionEnd) {
    chatUi.timer.classList.remove('hidden');
    chatUi.timer.textContent = `Act: ${formatTime(actionEnd - Date.now())}`;
  } else {
    chatUi.timer.classList.add('hidden');
  }
}

function startTimerLoop() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!lastState) return;
    const discussionEnd = lastState.discussionEndsAt;
    const actionEnd = lastState.me?.actionDeadlineAt;
    [lobbyChat, gameChat].forEach((ui) => {
      if (!ui || ui.timer.classList.contains('hidden')) return;
      if (discussionEnd) {
        ui.timer.textContent = formatTime(discussionEnd - Date.now());
      } else if (actionEnd) {
        ui.timer.textContent = `Act: ${formatTime(actionEnd - Date.now())}`;
      }
    });
    const actionEl = $('#action-timer');
    if (actionEl && actionEnd) {
      actionEl.textContent = formatTime(actionEnd - Date.now());
    }
  }, 250);
}

function getActiveChat() {
  if (lastState?.phase === 'lobby') return lobbyChat;
  return gameChat;
}

function setupChatForm(chatUi) {
  chatUi.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatUi.input.value.trim();
    if (!text) return;
    socket.emit('chat:send', { text }, (res) => {
      if (!res?.ok) {
        alert(res?.error || 'Could not send');
        return;
      }
      chatUi.input.value = '';
    });
  });
}

function renderRoomList(rooms) {
  const list = $('#room-list');
  const empty = $('#room-list-empty');
  if (!rooms?.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  list.innerHTML = rooms
    .map(
      (r) => `
    <li class="room-item">
      <div class="room-item-info">
        <strong>${escapeHtml(r.code)}</strong>
        <span>${r.players}/${r.max} · host ${escapeHtml(r.hostName)}</span>
        <span class="room-names">${escapeHtml((r.playerNames || []).join(', '))}</span>
      </div>
      <button type="button" class="btn secondary small btn-join-room" data-code="${escapeHtml(r.code)}">Join</button>
    </li>`
    )
    .join('');

  list.querySelectorAll('.btn-join-room').forEach((btn) => {
    btn.addEventListener('click', () => joinRoom(btn.dataset.code));
  });
}

function joinRoom(code) {
  const name = $('#player-name').value.trim();
  if (!name) return showError($('#join-error'), 'Enter your name first');
  socket.emit('room:join', { code, playerName: name }, (res) => {
    if (!res?.ok) return showError($('#join-error'), res?.error);
    myPlayerId = res.playerId;
    saveSession({ roomCode: res.code, playerId: res.playerId, playerName: name });
    showError($('#join-error'), '');
    showScreen('lobby');
    $('#display-code').textContent = res.code;
  });
}

function tryRestoreSession() {
  const session = loadSession();
  if (!session?.roomCode || !session?.playerId) return;

  socket.emit(
    'session:restore',
    { roomCode: session.roomCode, playerId: session.playerId },
    (res) => {
      if (!res?.ok) {
        clearSession();
        return;
      }
      myPlayerId = res.playerId;
      if (session.playerName) {
        $('#player-name').value = session.playerName;
      }
      $('#display-code').textContent = res.code;
      showError($('#join-error'), '');
    }
  );
}

function livingTargets(state, { excludeSelf = true, onlyTie = false } = {}) {
  let list = state.players.filter((p) => p.alive);
  if (onlyTie && state.day?.tieCandidates?.length) {
    list = list.filter((p) => state.day.tieCandidates.includes(p.id));
  }
  if (excludeSelf && state.me) {
    list = list.filter((p) => p.id !== state.me.id);
  }
  return list;
}

function renderModeratorLog(log) {
  const el = $('#moderator-log');
  el.innerHTML = (log || [])
    .map((entry) => `<p>${escapeHtml(entry.text)}</p>`)
    .join('');
  el.scrollTop = el.scrollHeight;
}

function renderPlayerList(container, players, meId, hostId, showRoles = false) {
  container.innerHTML = players
    .map((p) => {
      const tags = [];
      if (p.id === hostId) tags.push('<span class="tag host">Host</span>');
      if (p.id === meId) tags.push('<span class="tag you">You</span>');
      if (!p.alive) tags.push('<span class="tag">Dead</span>');
      else if (p.connected === false) tags.push('<span class="tag">Away</span>');
      if (showRoles && p.roleLabel) {
        tags.push(`<span class="tag">${escapeHtml(p.roleLabel)}</span>`);
      }
      return `<li class="${p.alive ? '' : 'dead'}"><span>${escapeHtml(p.name)}</span><span>${tags.join('')}</span></li>`;
    })
    .join('');
}

function renderLobbyPlayerList(state) {
  const container = $('#player-list');
  const isHost = state.me?.id === state.hostId;
  container.innerHTML = state.players
    .map((p) => {
      const tags = [];
      if (p.id === state.hostId) tags.push('<span class="tag host">Host</span>');
      if (p.id === myPlayerId) tags.push('<span class="tag you">You</span>');
      if (!p.alive) tags.push('<span class="tag">Dead</span>');
      else if (p.connected === false) tags.push('<span class="tag">Away</span>');
      const kickBtn =
        isHost && p.id !== state.hostId
          ? `<button type="button" class="btn ghost small btn-kick-player" data-id="${p.id}">Remove</button>`
          : '';
      return `<li class="${p.alive ? '' : 'dead'}">
        <span>${escapeHtml(p.name)}</span>
        <span>${tags.join('')} ${kickBtn}</span>
      </li>`;
    })
    .join('');

  container.querySelectorAll('.btn-kick-player').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.id;
      const target = state.players.find((p) => p.id === targetId);
      if (!targetId || !target) return;
      if (!confirm(`Remove ${target.name} from the room?`)) return;
      socket.emit('room:kick-player', { targetId }, (res) => {
        if (!res?.ok) alert(res?.error || 'Could not remove player');
      });
    });
  });
}

function showRoleCard(role) {
  const card = $('#role-card');
  card.classList.remove('hidden', 'werewolf', 'seer', 'witch', 'villager');
  card.classList.add(role);
  $('#my-role').textContent =
    { werewolf: 'Werewolf', seer: 'Seer', witch: 'Witch', villager: 'Villager' }[role] || role;
}

function targetGrid(state, mode, opts = {}) {
  const targets = livingTargets(state, {
    excludeSelf: mode !== 'seer-check',
    onlyTie: opts.onlyTie,
  });
  return `<div class="target-grid" data-mode="${mode}">${targets
    .map(
      (p) =>
        `<button type="button" class="target-btn" data-id="${p.id}">${escapeHtml(p.name)}</button>`
    )
    .join('')}${opts.allowSkip ? `<button type="button" class="target-btn" data-id="">No poison</button>` : ''}</div>`;
}

let selectedTarget = null;
let witchSave = false;
let witchPoison = null;

function wireActionHandlers(state) {
  selectedTarget = null;
  document.querySelectorAll('.target-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.target-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedTarget = btn.dataset.id || null;
      $('#btn-wolf-submit')?.removeAttribute('disabled');
      $('#btn-seer-submit')?.removeAttribute('disabled');
      $('#btn-vote-submit')?.removeAttribute('disabled');
    });
  });

  $('#btn-wolf-submit')?.addEventListener('click', () => {
    if (!selectedTarget) return;
    socket.emit('night:wolf-vote', { targetId: selectedTarget }, (res) => {
      if (!res?.ok) alert(res?.error || 'Failed');
    });
  });

  $('#btn-seer-submit')?.addEventListener('click', () => {
    if (!selectedTarget) return;
    socket.emit('night:seer-check', { targetId: selectedTarget }, (res) => {
      if (!res?.ok) alert(res?.error || 'Failed');
      else if (res.resultLabel) {
        const p = state.players.find((x) => x.id === selectedTarget);
        seerResults.push({ name: p?.name, alignment: res.result, label: res.resultLabel });
        renderActionPanel(state);
      }
    });
  });

  $('#btn-vote-submit')?.addEventListener('click', () => {
    socket.emit('day:vote', { targetId: selectedTarget }, (res) => {
      if (!res?.ok) alert(res?.error || 'Failed');
    });
  });

  $('#btn-abstain')?.addEventListener('click', () => {
    socket.emit('day:vote', { targetId: null }, (res) => {
      if (!res?.ok) alert(res?.error || 'Failed');
    });
  });

  $('#btn-last-words-done')?.addEventListener('click', () => {
    socket.emit('day:last-words-done', {}, (res) => {
      if (!res?.ok) alert(res?.error || 'Failed');
    });
  });

  $('#btn-skip-last-words')?.addEventListener('click', () => {
    socket.emit('day:skip-last-words', {});
  });

  $('#btn-start-vote')?.addEventListener('click', () => {
    socket.emit('day:discussion-done', {}, (res) => {
      if (!res?.ok) alert(res?.error || 'Failed');
    });
  });

  $('#btn-tie-revote')?.addEventListener('click', () => {
    socket.emit('day:tie-speak-done', {});
  });

  $('#btn-witch-finish')?.addEventListener('click', () => {
    socket.emit('night:witch', { save: witchSave, poisonTargetId: witchPoison }, (res) => {
      if (!res?.ok) alert(res?.error || 'Failed');
      witchSave = false;
      witchPoison = null;
    });
  });

  $('#btn-witch-skip-save')?.addEventListener('click', () => {
    witchSave = false;
    $('#btn-witch-save')?.removeAttribute('disabled');
  });
}

function renderActionPanel(state) {
  const panel = $('#action-panel');
  const me = state.me;
  if (!me || state.phase === 'game_over' || state.phase === 'lobby') {
    panel.classList.add('hidden');
    return;
  }

  let html = '';
  const phase = state.phase;

  if (state.me?.actionDeadlineAt) {
    html += `<p class="action-deadline">⏱ Act within <strong id="action-timer">${formatTime(state.me.actionDeadlineAt - Date.now())}</strong> or you will be kicked</p>`;
  }

  if (!me.alive && phase !== 'day_last_words') {
    panel.innerHTML =
      '<p class="hint">You are out. Read chat — you cannot send messages.</p>';
    panel.classList.remove('hidden');
    return;
  }

  if (phase === 'night_werewolf' && me.role === 'werewolf' && me.alive) {
    html = `<h4>Choose a victim</h4><p class="hint">Use pack chat to agree, then confirm.</p>`;
    html += targetGrid(state, 'wolf-vote');
    html += `<button class="btn primary full" id="btn-wolf-submit" disabled>Confirm kill</button>`;
  } else if (phase === 'night_seer' && me.role === 'seer' && me.alive) {
    html = `<h4>Inspect a player</h4>`;
    html += targetGrid(state, 'seer-check');
    html += `<button class="btn primary full" id="btn-seer-submit" disabled>Confirm check</button>`;
    const last = seerResults[seerResults.length - 1];
    if (last) {
      html += `<div class="seer-result ${last.alignment}">${escapeHtml(last.name)}: ${escapeHtml(last.label)}</div>`;
    }
  } else if (phase === 'night_witch' && me.role === 'witch' && me.alive) {
    html = `<h4>Witch potions</h4><p class="hint" id="witch-hint">Loading…</p>`;
    html += `<div class="action-row">
      <button class="btn secondary" id="btn-witch-save" disabled>Heal</button>
      <button class="btn ghost" id="btn-witch-skip-save">Skip heal</button>
    </div>`;
    html += `<h4>Poison</h4>`;
    html += targetGrid(state, 'witch-poison', { allowSkip: true });
    html += `<button class="btn primary full" id="btn-witch-finish">End night</button>`;
  } else if (phase === 'day_last_words' && state.day?.lastWordsPlayerId === me.id) {
    html = `<h4>Last words</h4><p class="hint">Type in chat, then tap done.</p>`;
    html += `<button class="btn primary full" id="btn-last-words-done">Done</button>`;
  } else if (phase === 'day_last_words' && me.id === state.hostId) {
    html = `<p class="hint">Waiting for last words in chat…</p>`;
    html += `<button class="btn ghost full" id="btn-skip-last-words">Skip (host)</button>`;
  } else if (phase === 'day_discussion') {
    if (me.id === state.hostId) {
      html = `<button class="btn secondary full" id="btn-start-vote">Skip timer → vote early</button>`;
    }
  } else if (phase === 'day_tie_speak' && me.id === state.hostId) {
    html = `<button class="btn secondary full" id="btn-tie-revote">Skip timer → revote early</button>`;
  } else if (phase === 'day_vote' || phase === 'day_tie_vote') {
    html = `<h4>Vote</h4>`;
    html += targetGrid(state, 'vote', { onlyTie: phase === 'day_tie_vote' });
    html += `<button class="btn primary full" id="btn-vote-submit" disabled>Confirm vote</button>`;
    html += `<button class="btn ghost full" id="btn-abstain">Abstain</button>`;
  } else if (phase.startsWith('night') && me.alive) {
    html = `<p class="hint">Night phase — wait for your turn.</p>`;
  }

  if (!html) {
    panel.classList.add('hidden');
    return;
  }

  panel.innerHTML = html;
  panel.classList.remove('hidden');
  wireActionHandlers(state);
}

function updatePhaseBadge(phase) {
  const badge = $('#phase-badge');
  badge.textContent = PHASE_LABELS[phase] || phase;
  badge.classList.remove('night', 'day');
  if (phase.startsWith('night')) badge.classList.add('night');
  if (phase.startsWith('day')) badge.classList.add('day');
}

function applyState(state) {
  lastState = state;
  if (state.me?.role) {
    myRole = state.me.role;
    showRoleCard(myRole);
  }

  if (state.phase === 'lobby') {
    updateChatUI(lobbyChat, state);
    renderChatMessages(lobbyChat, state.chat, { reset: true });
  } else {
    updateChatUI(gameChat, state);
    renderChatMessages(gameChat, state.chat, { reset: true });
  }

  if (state.phase === 'lobby') {
    showScreen('lobby');
    $('#display-code').textContent = state.code;
    $('#player-count').textContent = state.players.length;
    renderLobbyPlayerList(state);
    const isHost = state.me?.id === state.hostId;
    const full = state.players.length === 6;
    $('#btn-start').classList.toggle('hidden', !isHost);
    $('#btn-start').disabled = !full;
    $('#lobby-hint').textContent = full
      ? isHost
        ? 'Everyone is here — start when ready.'
        : 'Waiting for host…'
      : `Need ${6 - state.players.length} more player(s).`;
    return;
  }

  showScreen('game');
  updatePhaseBadge(state.phase);
  $('#round-display').textContent = state.round ? `Round ${state.round}` : '';
  renderModeratorLog(state.moderatorLog);
  renderPlayerList(
    $('#game-player-list'),
    state.players,
    myPlayerId,
    state.hostId,
    state.phase === 'game_over'
  );
  renderActionPanel(state);

  if (state.phase === 'game_over') {
    $('#game-over').classList.remove('hidden');
    $('#winner-text').textContent =
      state.winner === 'werewolves' ? 'Werewolves win!' : 'The good team wins!';
    $('#action-panel').classList.add('hidden');
  } else {
    $('#game-over').classList.add('hidden');
  }

  if (state.code && myPlayerId) {
    const nameInput = $('#player-name').value.trim();
    saveSession({
      roomCode: state.code,
      playerId: myPlayerId,
      playerName: nameInput || loadSession()?.playerName || '',
    });
  }
}

socket.on('game:state', applyState);

socket.on('game:role', ({ role }) => {
  myRole = role;
  showRoleCard(role);
});

socket.on('game:wolf', (data) => {
  const panel = $('#action-panel');
  if (!data?.partners) return;
  const existing = panel.querySelector('.wolf-partners');
  if (existing) existing.remove();
  const div = document.createElement('p');
  div.className = 'wolf-partners';
  div.textContent = `Pack: ${data.partners.map((p) => p.name).join(', ')}`;
  panel.prepend(div);
});

socket.on('game:witch', (data) => {
  const hint = $('#witch-hint');
  if (!hint || !data) return;
  const attacked = data.attacked?.name ?? 'no one';
  hint.textContent = `Attacked: ${attacked}. Heal: ${data.healUsed ? 'used' : 'yes'}. Poison: ${data.poisonUsed ? 'used' : 'yes'}.${data.canSelfSave ? ' (First night: self-save OK.)' : ''}`;
  const saveBtn = $('#btn-witch-save');
  if (saveBtn && !data.healUsed && data.attacked) {
    saveBtn.disabled = false;
    saveBtn.onclick = () => {
      witchSave = true;
      saveBtn.textContent = 'Heal ✓';
    };
  }
  document.querySelectorAll('[data-mode="witch-poison"] .target-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      witchPoison = btn.dataset.id || null;
    });
  });
});

socket.on('chat:message', (msg) => {
  const ui = lastState?.phase === 'lobby' ? lobbyChat : gameChat;
  appendChatMessage(ui, msg);
});

socket.on('rooms:list', renderRoomList);

socket.on('game:kicked', ({ reason }) => {
  clearSession();
  if (reason === 'host_removed') {
    alert('The host removed you from the room.');
  } else {
    alert('You were kicked for inactivity (1 minute to act).');
  }
  location.reload();
});

$('#btn-create').addEventListener('click', () => {
  const name = $('#player-name').value.trim();
  if (!name) return showError($('#join-error'), 'Enter your name');
  socket.emit('room:create', { playerName: name }, (res) => {
    if (!res?.ok) return showError($('#join-error'), res?.error);
    myPlayerId = res.playerId;
    saveSession({ roomCode: res.code, playerId: res.playerId, playerName: name });
    showError($('#join-error'), '');
    showScreen('lobby');
    $('#display-code').textContent = res.code;
  });
});

socket.on('connect', tryRestoreSession);

$('#btn-refresh-rooms').addEventListener('click', () => {
  socket.emit('rooms:list', renderRoomList);
});

$('#btn-start').addEventListener('click', () => {
  socket.emit('game:start', {}, (res) => {
    if (!res?.ok) alert(res?.error || 'Cannot start');
    else {
      seerResults = [];
      showScreen('game');
    }
  });
});

function leaveLobby() {
  socket.emit('room:leave', {}, (res) => {
    if (!res?.ok) {
      alert(res?.error || 'Could not leave');
      return;
    }
    clearSession();
    myPlayerId = null;
    lastState = null;
    chatKnownIds.clear();
    seerResults = [];
    if (lobbyChat) renderChatMessages(lobbyChat, [], { reset: true });
    showScreen('join');
    socket.emit('rooms:list', renderRoomList);
  });
}

$('#btn-leave-lobby').addEventListener('click', leaveLobby);
$('#btn-leave-game')?.addEventListener('click', leaveLobby);

$('#btn-play-again')?.addEventListener('click', () => {
  clearSession();
  location.reload();
});

const saved = loadSession();
if (saved?.playerName) {
  $('#player-name').value = saved.playerName;
}

lobbyChat = createChatUI($('#chat-lobby-mount'));
gameChat = createChatUI($('#chat-game-mount'));
setupChatForm(lobbyChat);
setupChatForm(gameChat);
startTimerLoop();

if (socket.connected) tryRestoreSession();
