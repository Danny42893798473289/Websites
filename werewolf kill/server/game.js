import {
  STANDARD_ROLES,
  ROLE_LABELS,
  isWerewolf,
  isGood,
  alignmentForSeer,
  shuffle,
} from './roles.js';

export const PHASE = {
  LOBBY: 'lobby',
  NIGHT_WEREWOLF: 'night_werewolf',
  NIGHT_SEER: 'night_seer',
  NIGHT_WITCH: 'night_witch',
  DAY_ANNOUNCE: 'day_announce',
  DAY_LAST_WORDS: 'day_last_words',
  DAY_DISCUSSION: 'day_discussion',
  DAY_VOTE: 'day_vote',
  DAY_TIE_SPEAK: 'day_tie_speak',
  DAY_TIE_VOTE: 'day_tie_vote',
  GAME_OVER: 'game_over',
};

const REQUIRED_PLAYERS = 6;
export const DISCUSSION_DURATION_MS = 3 * 60 * 1000;
export const TIE_SPEAK_DURATION_MS = 60 * 1000;
export const ACTION_TIMEOUT_MS = 60 * 1000;
const MAX_CHAT_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 500;

export class GameRoom {
  constructor(code, hostId) {
    this.code = code;
    this.hostId = hostId;
    this.players = new Map(); // id -> { id, name, socketId, alive, role }
    this.phase = PHASE.LOBBY;
    this.round = 0;
    this.night = {
      wolfTarget: null,
      wolfVotes: new Map(),
      seerTarget: null,
      seerResult: null,
      witchSave: false,
      witchPoisonTarget: null,
      attackedPlayerId: null,
    };
    this.day = {
      deaths: [],
      lastWordsQueue: [],
      lastWordsSource: null, // 'night' | 'vote'
      currentLastWordsPlayerId: null,
      votes: new Map(),
      tieCandidates: [],
      tieRound: 0, // 0 = normal vote, 1 = after tie speak, 2 = tie revote done
    };
    this.witch = {
      healUsed: false,
      poisonUsed: false,
    };
    this.winner = null;
    this.moderatorLog = [];
    this.firstNight = true;
    this.chatMessages = [];
    this.discussionEndsAt = null;
    this.discussionTimerId = null;
    this.createdAt = Date.now();
    this.onStateChange = null;
    this.onPlayerKicked = null;
    this.playerActionTimers = new Map();
  }

  clearPlayerActionTimer(playerId) {
    const t = this.playerActionTimers.get(playerId);
    if (t) {
      clearTimeout(t);
      this.playerActionTimers.delete(playerId);
    }
    const p = this.getPlayer(playerId);
    if (p) p.actionDeadlineAt = null;
  }

  clearAllActionTimers() {
    for (const id of [...this.playerActionTimers.keys()]) {
      this.clearPlayerActionTimer(id);
    }
  }

  needsActionTimer(playerId) {
    const p = this.getPlayer(playerId);
    return !!(p?.alive && p.connected !== false);
  }

  schedulePlayerAction(playerId) {
    if (!this.needsActionTimer(playerId)) return;
    this.clearPlayerActionTimer(playerId);
    const player = this.getPlayer(playerId);
    player.actionDeadlineAt = Date.now() + ACTION_TIMEOUT_MS;

    const timerId = setTimeout(() => {
      this.playerActionTimers.delete(playerId);
      if (player) player.actionDeadlineAt = null;
      const kick = this.kickPlayerForInactivity(playerId);
      if (!kick.ok) return;
      this.onPlayerKicked?.(kick);
      this.tryContinueAfterKick(playerId);
      this.refreshActionTimers();
      this.onStateChange?.();
    }, ACTION_TIMEOUT_MS);

    this.playerActionTimers.set(playerId, timerId);
  }

  refreshActionTimers() {
    this.clearAllActionTimers();
    if (
      this.phase === PHASE.GAME_OVER ||
      this.phase === PHASE.LOBBY ||
      this.phase === PHASE.DAY_DISCUSSION ||
      this.phase === PHASE.DAY_TIE_SPEAK ||
      this.phase === PHASE.DAY_ANNOUNCE
    ) {
      return;
    }

    switch (this.phase) {
      case PHASE.NIGHT_WEREWOLF:
        for (const w of this.livingWolves()) {
          if (!this.night.wolfVotes.has(w.id)) this.schedulePlayerAction(w.id);
        }
        break;
      case PHASE.NIGHT_SEER: {
        const seer = this.livingPlayers().find((p) => p.role === 'seer');
        if (seer) this.schedulePlayerAction(seer.id);
        break;
      }
      case PHASE.NIGHT_WITCH: {
        const witch = this.livingPlayers().find((p) => p.role === 'witch');
        if (witch) this.schedulePlayerAction(witch.id);
        break;
      }
      case PHASE.DAY_LAST_WORDS:
        if (this.day.currentLastWordsPlayerId) {
          this.schedulePlayerAction(this.day.currentLastWordsPlayerId);
        }
        break;
      case PHASE.DAY_VOTE:
      case PHASE.DAY_TIE_VOTE:
        for (const p of this.livingPlayers()) {
          if (!this.day.votes.has(p.id)) this.schedulePlayerAction(p.id);
        }
        break;
      default:
        break;
    }
  }

  kickPlayerForInactivity(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return { ok: false };

    const socketId = player.socketId;
    const name = player.name;
    this.clearPlayerActionTimer(playerId);

    if (this.phase === PHASE.LOBBY) {
      this.removePlayer(playerId);
      this.log(`${name} was removed (inactive).`);
      return { ok: true, socketId, name };
    }

    this.removePlayer(playerId);
    this.log(`${name} was kicked for inactivity (1 min limit).`);

    const win = this.checkWin();
    if (win) {
      this.phase = PHASE.GAME_OVER;
      this.winner = win;
      this.log(win === 'werewolves' ? 'Werewolves win!' : 'The good team wins!');
      this.clearAllActionTimers();
      return { ok: true, socketId, name, gameOver: true };
    }

    return { ok: true, socketId, name };
  }

  finalizeWolfKill() {
    const wolves = this.livingWolves();
    const votes = [...this.night.wolfVotes.entries()].filter(([wid]) =>
      wolves.some((w) => w.id === wid)
    );
    if (votes.length < wolves.length || wolves.length === 0) return false;

    const counts = new Map();
    for (const [, tid] of votes) {
      counts.set(tid, (counts.get(tid) || 0) + 1);
    }
    let max = 0;
    let chosen = null;
    let tie = false;
    for (const [tid, c] of counts) {
      if (c > max) {
        max = c;
        chosen = tid;
        tie = false;
      } else if (c === max) {
        tie = true;
      }
    }
    if (tie || !chosen) {
      this.night.wolfVotes.clear();
      this.refreshActionTimers();
      return false;
    }

    this.night.wolfTarget = chosen;
    this.night.attackedPlayerId = chosen;
    this.phase = PHASE.NIGHT_SEER;
    this.log('Werewolves close their eyes.');
    this.log('Seer, open your eyes and choose a player to inspect.');
    this.refreshActionTimers();
    return true;
  }

  advanceAfterSeerSkipped() {
    const witchAlive = this.livingPlayers().some((p) => p.role === 'witch');
    if (witchAlive) {
      this.phase = PHASE.NIGHT_WITCH;
      const attacked = this.getPlayer(this.night.attackedPlayerId);
      this.log('Seer closes their eyes.');
      this.log(
        `Witch, open your eyes. Tonight ${attacked?.name ?? 'someone'} was attacked. Would you like to save them? Would you like to poison someone?`
      );
      this.refreshActionTimers();
    } else {
      this.resolveNight();
    }
  }

  tryContinueAfterKick(kickedId) {
    switch (this.phase) {
      case PHASE.NIGHT_WEREWOLF: {
        if (this.livingWolves().length === 0) {
          this.phase = PHASE.NIGHT_SEER;
          this.log('Seer, open your eyes and choose a player to inspect.');
          this.refreshActionTimers();
          break;
        }
        this.finalizeWolfKill();
        break;
      }
      case PHASE.NIGHT_SEER: {
        if (!this.livingPlayers().some((p) => p.role === 'seer')) {
          this.advanceAfterSeerSkipped();
        }
        break;
      }
      case PHASE.NIGHT_WITCH: {
        if (!this.livingPlayers().some((p) => p.role === 'witch')) {
          this.resolveNight();
        }
        break;
      }
      case PHASE.DAY_LAST_WORDS: {
        if (kickedId === this.day.currentLastWordsPlayerId) {
          this.day.lastWordsQueue = this.day.lastWordsQueue.filter((id) => id !== kickedId);
          if (this.day.lastWordsQueue.length > 0) {
            this.day.currentLastWordsPlayerId = this.day.lastWordsQueue[0];
            const p = this.getPlayer(this.day.currentLastWordsPlayerId);
            this.log(`${p?.name} may give their last words.`);
            this.refreshActionTimers();
          } else if (this.day.lastWordsSource === 'vote') {
            this.endDay();
          } else {
            this.beginDiscussion();
          }
        }
        break;
      }
      case PHASE.DAY_VOTE:
      case PHASE.DAY_TIE_VOTE: {
        const living = this.livingPlayers();
        if (living.length > 0 && living.every((p) => this.day.votes.has(p.id))) {
          this.resolveVotes();
        }
        break;
      }
      default:
        break;
    }
  }

  clearDiscussionTimer() {
    if (this.discussionTimerId) {
      clearTimeout(this.discussionTimerId);
      this.discussionTimerId = null;
    }
    this.discussionEndsAt = null;
  }

  startDiscussionTimer(durationMs) {
    this.clearDiscussionTimer();
    this.discussionEndsAt = Date.now() + durationMs;
    this.discussionTimerId = setTimeout(() => {
      this.discussionTimerId = null;
      this.discussionEndsAt = null;
      this.onDiscussionTimerEnd();
    }, durationMs);
  }

  onDiscussionTimerEnd() {
    if (this.phase === PHASE.DAY_DISCUSSION) {
      this.log('Discussion time is up — voting begins.');
      this.beginVote();
      this.onStateChange?.();
      return true;
    }
    if (this.phase === PHASE.DAY_TIE_SPEAK) {
      this.phase = PHASE.DAY_TIE_VOTE;
      this.day.votes.clear();
      this.log('Time is up — revote now.');
      this.refreshActionTimers();
      this.onStateChange?.();
      return true;
    }
    return false;
  }

  canSendChat(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return false;
    if (this.phase === PHASE.LOBBY) return true;
    if (this.phase === PHASE.GAME_OVER) return false;
    if (this.phase === PHASE.NIGHT_WEREWOLF && isWerewolf(player.role) && player.alive) {
      return true;
    }
    if (this.phase === PHASE.DAY_LAST_WORDS) {
      return playerId === this.day.currentLastWordsPlayerId;
    }
    const dayChatPhases = [
      PHASE.DAY_DISCUSSION,
      PHASE.DAY_VOTE,
      PHASE.DAY_TIE_SPEAK,
      PHASE.DAY_TIE_VOTE,
    ];
    if (dayChatPhases.includes(this.phase) && player.alive) return true;
    return false;
  }

  getChatChannel(playerId) {
    if (this.phase === PHASE.LOBBY) return 'lobby';
    if (this.phase === PHASE.NIGHT_WEREWOLF) return 'wolf';
    if (this.phase === PHASE.DAY_LAST_WORDS) return 'last_words';
    return 'day';
  }

  getChatHint(playerId) {
    if (!this.canSendChat(playerId)) {
      if (this.phase === PHASE.GAME_OVER) return 'Game over';
      if (!this.getPlayer(playerId)?.alive && this.phase !== PHASE.LOBBY) {
        return 'Dead players cannot chat';
      }
      if (this.phase.startsWith('night')) return 'Night — no public chat';
      return 'Chat closed';
    }
    if (this.phase === PHASE.NIGHT_WEREWOLF) return 'Wolf pack chat only';
    if (this.phase === PHASE.DAY_LAST_WORDS) return 'Last words — type below';
    if (this.phase === PHASE.DAY_TIE_SPEAK) return 'Tiebreaker — chat before revote';
    return 'Chat open';
  }

  canSeeMessage(playerId, msg) {
    const player = this.getPlayer(playerId);
    if (!player) return false;
    if (msg.channel === 'lobby') return this.phase === PHASE.LOBBY;
    if (msg.channel === 'wolf') {
      return isWerewolf(player.role);
    }
    if (msg.channel === 'last_words' || msg.channel === 'day') return true;
    return false;
  }

  getChatForPlayer(playerId) {
    return this.chatMessages.filter((m) => this.canSeeMessage(playerId, m));
  }

  addChat(playerId, text) {
    if (!this.canSendChat(playerId)) {
      return { ok: false, error: 'You cannot chat right now' };
    }
    const player = this.getPlayer(playerId);
    const trimmed = String(text || '').trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!trimmed) return { ok: false, error: 'Empty message' };

    const msg = {
      id: crypto.randomUUID(),
      playerId,
      playerName: player.name,
      text: trimmed,
      channel: this.getChatChannel(playerId),
      at: Date.now(),
    };
    this.chatMessages.push(msg);
    if (this.chatMessages.length > MAX_CHAT_MESSAGES) {
      this.chatMessages.splice(0, this.chatMessages.length - MAX_CHAT_MESSAGES);
    }
    return { ok: true, message: msg };
  }

  addPlayer(id, name, socketId) {
    if (this.phase !== PHASE.LOBBY) return { ok: false, error: 'Game already started' };
    if (this.players.size >= REQUIRED_PLAYERS) {
      return { ok: false, error: 'Room is full (6 players)' };
    }
    if ([...this.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: 'Name already taken' };
    }
    this.players.set(id, {
      id,
      name,
      socketId,
      alive: true,
      role: null,
      connected: true,
    });
    return { ok: true };
  }

  disconnectPlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    p.connected = false;
    p.socketId = null;
  }

  reconnectPlayer(id, socketId) {
    const p = this.players.get(id);
    if (!p) return { ok: false, error: 'Player not found' };
    p.connected = true;
    p.socketId = socketId;
    return { ok: true, player: p };
  }

  connectedCount() {
    return [...this.players.values()].filter((p) => p.connected).length;
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.hostId === id && this.players.size > 0) {
      this.hostId = [...this.players.keys()][0];
    }
  }

  removePlayerByHost(hostPlayerId, targetPlayerId) {
    if (this.phase !== PHASE.LOBBY) {
      return { ok: false, error: 'Can only remove players in the lobby' };
    }
    if (hostPlayerId !== this.hostId) {
      return { ok: false, error: 'Only host can remove players' };
    }
    if (targetPlayerId === hostPlayerId) {
      return { ok: false, error: 'Host cannot remove themselves' };
    }
    const target = this.getPlayer(targetPlayerId);
    if (!target) return { ok: false, error: 'Player not found' };

    const socketId = target.socketId;
    const name = target.name;
    this.removePlayer(targetPlayerId);
    this.log(`${name} was removed by host.`);
    return { ok: true, socketId, name, reason: 'host_removed' };
  }

  playerLeave(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return { ok: false, error: 'Player not found' };

    const socketId = player.socketId;
    const name = player.name;
    const wasAlive = player.alive;

    this.clearPlayerActionTimer(playerId);
    this.removePlayer(playerId);

    if (this.phase === PHASE.LOBBY) {
      this.log(`${name} left the room.`);
      return { ok: true, socketId, name, reason: 'left_lobby' };
    }

    this.log(`${name} left the game.`);

    if (wasAlive) {
      const win = this.checkWin();
      if (win) {
        this.phase = PHASE.GAME_OVER;
        this.winner = win;
        this.log(win === 'werewolves' ? 'Werewolves win!' : 'The good team wins!');
        this.clearAllActionTimers();
        return { ok: true, socketId, name, reason: 'left_game', gameOver: true };
      }
    }

    this.tryContinueAfterKick(playerId);
    this.refreshActionTimers();
    return { ok: true, socketId, name, reason: 'left_game' };
  }

  canStart() {
    return this.phase === PHASE.LOBBY && this.players.size === REQUIRED_PLAYERS;
  }

  start() {
    if (!this.canStart()) return { ok: false, error: 'Need exactly 6 players' };
    const ids = [...this.players.keys()];
    const roles = shuffle(STANDARD_ROLES);
    ids.forEach((id, i) => {
      const p = this.players.get(id);
      p.role = roles[i];
      p.alive = true;
    });
    this.round = 1;
    this.phase = PHASE.NIGHT_WEREWOLF;
    this.resetNight();
    this.log('Game started. Night falls — everyone close your eyes.');
    this.log('Werewolves, open your eyes and choose your target.');
    this.refreshActionTimers();
    return { ok: true };
  }

  resetNight() {
    this.night = {
      wolfTarget: null,
      wolfVotes: new Map(),
      seerTarget: null,
      seerResult: null,
      witchSave: false,
      witchPoisonTarget: null,
      attackedPlayerId: null,
    };
  }

  resetDay() {
    this.day = {
      deaths: [],
      lastWordsQueue: [],
      lastWordsSource: null,
      currentLastWordsPlayerId: null,
      votes: new Map(),
      tieCandidates: [],
      tieRound: 0,
    };
  }

  log(msg) {
    this.moderatorLog.push({ time: Date.now(), text: msg });
    if (this.moderatorLog.length > 100) this.moderatorLog.shift();
  }

  livingPlayers() {
    return [...this.players.values()].filter((p) => p.alive);
  }

  livingWolves() {
    return this.livingPlayers().filter((p) => isWerewolf(p.role));
  }

  livingGood() {
    return this.livingPlayers().filter((p) => isGood(p.role));
  }

  getPlayer(id) {
    return this.players.get(id);
  }

  /** Public state safe for all clients */
  publicState(forPlayerId = null) {
    const me = forPlayerId ? this.players.get(forPlayerId) : null;
    return {
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      round: this.round,
      firstNight: this.firstNight,
      winner: this.winner,
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        alive: p.alive,
        connected: p.connected !== false,
        role: this.phase === PHASE.GAME_OVER || !p.alive ? p.role : null,
        roleLabel:
          this.phase === PHASE.GAME_OVER || !p.alive
            ? ROLE_LABELS[p.role]
            : null,
      })),
      me: me
        ? {
            id: me.id,
            name: me.name,
            alive: me.alive,
            role: me.role,
            roleLabel: ROLE_LABELS[me.role],
            isHost: me.id === this.hostId,
            actionDeadlineAt: me.actionDeadlineAt ?? null,
          }
        : null,
      actionTimeoutSec: ACTION_TIMEOUT_MS / 1000,
      moderatorLog: this.moderatorLog.slice(-20),
      day: {
        tieCandidates: this.day.tieCandidates,
        tieRound: this.day.tieRound,
        deathsTonight: this.day.deaths,
        lastWordsPlayerId: this.day.currentLastWordsPlayerId,
      },
      witch: forPlayerId && me?.role === 'witch'
        ? { healUsed: this.witch.healUsed, poisonUsed: this.witch.poisonUsed }
        : undefined,
      chat: forPlayerId ? this.getChatForPlayer(forPlayerId) : [],
      canChat: forPlayerId ? this.canSendChat(forPlayerId) : false,
      chatHint: forPlayerId ? this.getChatHint(forPlayerId) : '',
      discussionEndsAt: this.discussionEndsAt,
    };
  }

  wolfVote(playerId, targetId) {
    if (this.phase !== PHASE.NIGHT_WEREWOLF) return { ok: false, error: 'Not werewolf phase' };
    const player = this.getPlayer(playerId);
    if (!player?.alive || !isWerewolf(player.role)) {
      return { ok: false, error: 'Only living werewolves can vote' };
    }
    const target = this.getPlayer(targetId);
    if (!target?.alive) return { ok: false, error: 'Invalid target' };
    if (targetId === playerId) return { ok: false, error: 'Cannot target yourself' };

    this.night.wolfVotes.set(playerId, targetId);
    this.clearPlayerActionTimer(playerId);

    const wolves = this.livingWolves();
    const votes = [...this.night.wolfVotes.entries()].filter(([wid]) =>
      wolves.some((w) => w.id === wid)
    );

    if (votes.length < wolves.length) {
      return { ok: true, waiting: true };
    }

    if (!this.finalizeWolfKill()) {
      return { ok: false, error: 'Werewolves must agree on one target' };
    }
    return { ok: true, advanced: true };
  }

  seerCheck(playerId, targetId) {
    if (this.phase !== PHASE.NIGHT_SEER) return { ok: false, error: 'Not seer phase' };
    const player = this.getPlayer(playerId);
    if (!player?.alive || player.role !== 'seer') {
      return { ok: false, error: 'Only the living Seer can check' };
    }
    const target = this.getPlayer(targetId);
    if (!target) return { ok: false, error: 'Invalid target' };

    this.clearPlayerActionTimer(playerId);
    this.night.seerTarget = targetId;
    this.night.seerResult = alignmentForSeer(target.role);
    const witchAlive = this.livingPlayers().some((p) => p.role === 'witch');

    if (witchAlive) {
      this.phase = PHASE.NIGHT_WITCH;
      const attacked = this.getPlayer(this.night.attackedPlayerId);
      this.log('Seer closes their eyes.');
      this.log(
        `Witch, open your eyes. Tonight ${attacked?.name ?? 'someone'} was attacked. Would you like to save them? Would you like to poison someone?`
      );
      this.refreshActionTimers();
    } else {
      this.resolveNight();
    }
    return {
      ok: true,
      result: this.night.seerResult,
      resultLabel: this.night.seerResult === 'werewolf' ? 'Werewolf' : 'Good',
    };
  }

  witchAction(playerId, { save, poisonTargetId }) {
    if (this.phase !== PHASE.NIGHT_WITCH) return { ok: false, error: 'Not witch phase' };
    const player = this.getPlayer(playerId);
    if (!player?.alive || player.role !== 'witch') {
      return { ok: false, error: 'Only the living Witch can act' };
    }

    if (save) {
      if (this.witch.healUsed) return { ok: false, error: 'Healing potion already used' };
      const attacked = this.night.attackedPlayerId;
      if (!attacked) return { ok: false, error: 'No one was attacked' };
      if (attacked === playerId && !this.firstNight) {
        return { ok: false, error: 'Self-save only allowed on the first night' };
      }
      this.night.witchSave = true;
      this.witch.healUsed = true;
    }

    if (poisonTargetId) {
      if (this.witch.poisonUsed) return { ok: false, error: 'Poison potion already used' };
      const target = this.getPlayer(poisonTargetId);
      if (!target?.alive) return { ok: false, error: 'Invalid poison target' };
      this.night.witchPoisonTarget = poisonTargetId;
      this.witch.poisonUsed = true;
    }

    this.clearPlayerActionTimer(playerId);
    this.resolveNight();
    return { ok: true };
  }

  resolveNight() {
    this.clearAllActionTimers();
    const deaths = new Set();
    const attacked = this.night.attackedPlayerId;
    if (attacked && !this.night.witchSave) {
      deaths.add(attacked);
    }
    if (this.night.witchPoisonTarget) {
      deaths.add(this.night.witchPoisonTarget);
    }

    for (const id of deaths) {
      const p = this.getPlayer(id);
      if (p) p.alive = false;
    }

    this.day.deaths = [...deaths].map((id) => {
      const p = this.getPlayer(id);
      return { id, name: p?.name, cause: id === attacked && !this.night.witchSave ? 'wolf' : 'poison' };
    });
    this.day.lastWordsQueue = [...deaths];
    this.day.lastWordsSource = 'night';

    this.firstNight = false;
    this.phase = PHASE.DAY_ANNOUNCE;

    if (deaths.size === 0) {
      this.log('Day breaks. It was a peaceful night.');
    } else if (deaths.size === 1) {
      const d = this.day.deaths[0];
      this.log(`Day breaks. Last night, ${d.name} died.`);
    } else {
      const names = this.day.deaths.map((d) => d.name).join(' and ');
      this.log(`Day breaks. Last night, ${names} died.`);
    }

    const win = this.checkWin();
    if (win) {
      this.phase = PHASE.GAME_OVER;
      this.winner = win;
      this.log(win === 'werewolves' ? 'Werewolves win!' : 'The good team wins!');
      return;
    }

    if (this.day.lastWordsQueue.length > 0) {
      this.phase = PHASE.DAY_LAST_WORDS;
      this.day.currentLastWordsPlayerId = this.day.lastWordsQueue[0];
      const p = this.getPlayer(this.day.currentLastWordsPlayerId);
      this.log(`${p?.name} may give their last words.`);
      this.refreshActionTimers();
    } else {
      this.beginDiscussion();
    }
  }

  lastWordsDone(playerId) {
    if (this.phase !== PHASE.DAY_LAST_WORDS) return { ok: false, error: 'Not last words phase' };
    if (playerId !== this.day.currentLastWordsPlayerId) {
      return { ok: false, error: 'Not your turn' };
    }
    this.clearPlayerActionTimer(playerId);
    this.day.lastWordsQueue.shift();
    if (this.day.lastWordsQueue.length > 0) {
      this.day.currentLastWordsPlayerId = this.day.lastWordsQueue[0];
      const p = this.getPlayer(this.day.currentLastWordsPlayerId);
      this.log(`${p?.name} may give their last words.`);
      this.refreshActionTimers();
      return { ok: true, next: this.day.currentLastWordsPlayerId };
    }
    if (this.day.lastWordsSource === 'vote') {
      return this.endDay();
    }
    this.beginDiscussion();
    return { ok: true, advanced: true };
  }

  beginDiscussion() {
    this.phase = PHASE.DAY_DISCUSSION;
    this.log('Discussion begins — chat now. Voting starts when the timer ends.');
    this.startDiscussionTimer(DISCUSSION_DURATION_MS);
  }

  beginTieSpeak() {
    this.phase = PHASE.DAY_TIE_SPEAK;
    const names = this.day.tieCandidates
      .map((id) => this.getPlayer(id)?.name)
      .join(', ');
    this.log(`Tie between ${names} — chat, then revote.`);
    this.startDiscussionTimer(TIE_SPEAK_DURATION_MS);
  }

  beginVote() {
    if (this.phase !== PHASE.DAY_DISCUSSION && this.phase !== PHASE.DAY_TIE_SPEAK) {
      return { ok: false, error: 'Cannot vote now' };
    }
    this.clearDiscussionTimer();
    this.phase = PHASE.DAY_VOTE;
    this.day.votes.clear();
    this.log('Voting phase — all living players vote (1 min each).');
    this.refreshActionTimers();
    return { ok: true };
  }

  castVote(playerId, targetId) {
    const votePhases = [PHASE.DAY_VOTE, PHASE.DAY_TIE_VOTE];
    if (!votePhases.includes(this.phase)) return { ok: false, error: 'Not voting phase' };
    const voter = this.getPlayer(playerId);
    if (!voter?.alive) return { ok: false, error: 'Dead players cannot vote' };

    const living = this.livingPlayers();
    if (!living.some((p) => p.id === playerId)) return { ok: false, error: 'Not in game' };

    if (targetId) {
      const allowed =
        this.phase === PHASE.DAY_TIE_VOTE
          ? this.day.tieCandidates.includes(targetId)
          : true;
      const target = this.getPlayer(targetId);
      if (!target?.alive || !allowed) return { ok: false, error: 'Invalid vote target' };
      if (targetId === playerId) return { ok: false, error: 'Cannot vote for yourself' };
    }

    this.day.votes.set(playerId, targetId || null);
    this.clearPlayerActionTimer(playerId);

    const livingIds = living.map((p) => p.id);
    const voted = livingIds.filter((id) => this.day.votes.has(id));
    if (voted.length < livingIds.length) {
      return { ok: true, waiting: true };
    }

    return this.resolveVotes();
  }

  resolveVotes() {
    const counts = new Map();
    let abstain = 0;
    for (const [, tid] of this.day.votes) {
      if (!tid) {
        abstain++;
        continue;
      }
      counts.set(tid, (counts.get(tid) || 0) + 1);
    }

    if (counts.size === 0) {
      this.log('No valid votes. Nobody is eliminated today.');
      return this.endDay();
    }

    let max = 0;
    const top = [];
    for (const [tid, c] of counts) {
      if (c > max) {
        max = c;
        top.length = 0;
        top.push(tid);
      } else if (c === max) {
        top.push(tid);
      }
    }

    if (top.length > 1) {
      if (this.phase === PHASE.DAY_VOTE && this.day.tieRound === 0) {
        this.day.tieCandidates = top;
        this.day.tieRound = 1;
        this.beginTieSpeak();
        return { ok: true, tie: true };
      }
      if (this.phase === PHASE.DAY_TIE_SPEAK || this.phase === PHASE.DAY_VOTE) {
        this.day.tieRound = 2;
        this.phase = PHASE.DAY_TIE_VOTE;
        this.day.votes.clear();
        const names = top.map((id) => this.getPlayer(id)?.name).join(', ');
        this.log(`Revote between ${names}.`);
        this.refreshActionTimers();
        return { ok: true, revote: true };
      }
      if (this.phase === PHASE.DAY_TIE_VOTE) {
        this.log('Still tied. Nobody is eliminated today.');
        return this.endDay();
      }
    }

    const eliminatedId = top[0];
    const ep = this.getPlayer(eliminatedId);
    ep.alive = false;
    this.log(`${ep.name} was voted out.`);
    this.day.deaths = [{ id: eliminatedId, name: ep.name, cause: 'vote' }];
    this.day.lastWordsQueue = [eliminatedId];
    this.day.lastWordsSource = 'vote';

    const win = this.checkWin();
    if (win) {
      this.phase = PHASE.GAME_OVER;
      this.winner = win;
      this.log(win === 'werewolves' ? 'Werewolves win!' : 'The good team wins!');
      return { ok: true, eliminated: eliminatedId, gameOver: true };
    }

    this.phase = PHASE.DAY_LAST_WORDS;
    this.day.currentLastWordsPlayerId = eliminatedId;
    this.log(`${ep.name} may give their last words.`);
    this.refreshActionTimers();
    return { ok: true, eliminated: eliminatedId };
  }

  endDay() {
    this.clearDiscussionTimer();
    this.clearAllActionTimers();
    this.resetDay();
    this.round++;
    this.resetNight();
    this.phase = PHASE.NIGHT_WEREWOLF;
    this.log('Night falls — everyone close your eyes.');
    this.log('Werewolves, open your eyes and choose your target.');
    this.refreshActionTimers();
    return { ok: true };
  }

  skipLastWordsAndContinue(playerId) {
    if (this.phase !== PHASE.DAY_LAST_WORDS) return { ok: false, error: 'Not last words' };
    return this.lastWordsDone(this.day.currentLastWordsPlayerId);
  }

  checkWin() {
    const wolves = this.livingWolves().length;
    const good = this.livingGood().length;
    if (wolves === 0) return 'good';
    if (wolves >= good) return 'werewolves';
    return null;
  }

  /** Night private payloads */
  wolfView(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || !isWerewolf(player.role)) return null;
    return {
      partners: this.livingPlayers()
        .filter((p) => isWerewolf(p.role))
        .map((p) => ({ id: p.id, name: p.name })),
      votes: Object.fromEntries(this.night.wolfVotes),
    };
  }

  witchView(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || player.role !== 'witch' || this.phase !== PHASE.NIGHT_WITCH) return null;
    const attacked = this.getPlayer(this.night.attackedPlayerId);
    return {
      attacked: attacked
        ? { id: attacked.id, name: attacked.name }
        : null,
      canSelfSave: this.firstNight,
      healUsed: this.witch.healUsed,
      poisonUsed: this.witch.poisonUsed,
    };
  }
}

const rooms = new Map();

export function createRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? createRoomCode() : code;
}

export function getRoom(code) {
  return rooms.get(code?.toUpperCase());
}

export function createRoom(hostId) {
  const code = createRoomCode();
  const room = new GameRoom(code, hostId);
  rooms.set(code, room);
  return room;
}

export function deleteRoom(code) {
  rooms.delete(code?.toUpperCase());
}

export function listPublicRooms() {
  return [...rooms.values()]
    .filter((r) => r.phase === PHASE.LOBBY)
    .map((r) => {
      const host = r.players.get(r.hostId);
      return {
        code: r.code,
        players: r.players.size,
        max: REQUIRED_PLAYERS,
        hostName: host?.name || 'Host',
        playerNames: [...r.players.values()].map((p) => p.name),
      };
    })
    .sort((a, b) => b.players - a.players);
}
