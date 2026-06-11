import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createRoom,
  getRoom,
  deleteRoom,
  listPublicRooms,
  PHASE,
} from './game.js';
import { ROLE_LABELS } from './roles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(path.join(__dirname, '../public')));

const playerRoom = new Map();
const roomCleanupTimers = new Map();
const ROOM_IDLE_MS = 30 * 60 * 1000;

function handlePlayerKicked(room, kick) {
  if (kick.socketId) {
    const s = io.sockets.sockets.get(kick.socketId);
    if (s) {
      playerRoom.delete(s.id);
      s.emit('game:kicked', { reason: kick.reason || 'inactive', name: kick.name });
      s.leave(room.code);
      s.disconnect(true);
    }
  }
  emitRoomState(room);
  broadcastRoomList();
}

function bindRoom(room) {
  room.onStateChange = () => {
    emitRoomState(room);
    broadcastRoomList();
  };
  room.onPlayerKicked = (kick) => handlePlayerKicked(room, kick);
}

function broadcastRoomList() {
  io.emit('rooms:list', listPublicRooms());
}

function emitRoomState(room) {
  for (const p of room.players.values()) {
    const socket = io.sockets.sockets.get(p.socketId);
    if (!socket) continue;
    socket.emit('game:state', room.publicState(p.id));

    if (room.phase === PHASE.NIGHT_WEREWOLF) {
      const wolf = room.wolfView(p.id);
      if (wolf) socket.emit('game:wolf', wolf);
    }
    if (room.phase === PHASE.NIGHT_WITCH) {
      const witch = room.witchView(p.id);
      if (witch) socket.emit('game:witch', witch);
    }
  }
}

function emitChat(room, msg) {
  for (const p of room.players.values()) {
    if (!room.canSeeMessage(p.id, msg)) continue;
    const socket = io.sockets.sockets.get(p.socketId);
    socket?.emit('chat:message', msg);
  }
}

function cancelRoomCleanup(code) {
  const t = roomCleanupTimers.get(code);
  if (t) {
    clearTimeout(t);
    roomCleanupTimers.delete(code);
  }
}

function scheduleRoomCleanup(code) {
  if (roomCleanupTimers.has(code)) return;
  roomCleanupTimers.set(
    code,
    setTimeout(() => {
      roomCleanupTimers.delete(code);
      const room = getRoom(code);
      if (room && room.connectedCount() === 0) {
        deleteRoom(code);
        broadcastRoomList();
      }
    }, ROOM_IDLE_MS)
  );
}

function attachSocketToPlayer(socket, room, playerId) {
  const player = room.getPlayer(playerId);
  if (!player) return false;

  if (player.socketId && player.socketId !== socket.id) {
    const oldSocket = io.sockets.sockets.get(player.socketId);
    if (oldSocket) {
      playerRoom.delete(oldSocket.id);
      oldSocket.disconnect(true);
    }
  }

  room.reconnectPlayer(playerId, socket.id);
  playerRoom.set(socket.id, { roomCode: room.code, playerId });
  socket.join(room.code);
  cancelRoomCleanup(room.code);
  return true;
}

function sendPlayerSync(socket, room, playerId) {
  const player = room.getPlayer(playerId);
  socket.emit('game:state', room.publicState(playerId));
  if (player?.role) {
    socket.emit('game:role', {
      role: player.role,
      roleLabel: ROLE_LABELS[player.role],
    });
    if (player.role === 'werewolf') {
      socket.emit('game:wolf', room.wolfView(playerId));
    }
  }
  if (room.phase === PHASE.NIGHT_WITCH) {
    const witch = room.witchView(playerId);
    if (witch) socket.emit('game:witch', witch);
  }
}

io.on('connection', (socket) => {
  socket.emit('rooms:list', listPublicRooms());

  socket.on('session:restore', ({ roomCode, playerId }, cb) => {
    const room = getRoom(roomCode);
    if (!room) {
      cb?.({ ok: false, error: 'Room not found' });
      return;
    }
    const player = room.getPlayer(playerId);
    if (!player) {
      cb?.({ ok: false, error: 'Session expired' });
      return;
    }

    if (!attachSocketToPlayer(socket, room, playerId)) {
      cb?.({ ok: false, error: 'Could not rejoin' });
      return;
    }
    if (!room.onStateChange) bindRoom(room);

    sendPlayerSync(socket, room, playerId);
    room.refreshActionTimers();
    emitRoomState(room);
    broadcastRoomList();
    cb?.({ ok: true, code: room.code, playerId, phase: room.phase });
  });

  socket.on('rooms:list', (cb) => {
    cb?.(listPublicRooms());
  });

  socket.on('chat:send', ({ text }, cb) => {
    const ctx = playerRoom.get(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'Not in a room' });
    const room = getRoom(ctx.roomCode);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const result = room.addChat(ctx.playerId, text);
    if (result.ok) {
      emitChat(room, result.message);
      emitRoomState(room);
    }
    cb?.(result);
  });

  socket.on('room:create', ({ playerName }, cb) => {
    const id = crypto.randomUUID();
    const room = createRoom(id);
    bindRoom(room);
    const result = room.addPlayer(id, playerName?.trim() || 'Host', socket.id);
    if (!result.ok) {
      deleteRoom(room.code);
      cb?.({ ok: false, error: result.error });
      return;
    }
    room.hostId = id;
    playerRoom.set(socket.id, { roomCode: room.code, playerId: id });
    socket.join(room.code);
    cb?.({ ok: true, code: room.code, playerId: id });
    emitRoomState(room);
    broadcastRoomList();
  });

  socket.on('room:leave', (_, cb) => {
    const ctx = playerRoom.get(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'Not in a room' });
    const room = getRoom(ctx.roomCode);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });

    const result = room.playerLeave(ctx.playerId);
    if (!result.ok) return cb?.(result);

    playerRoom.delete(socket.id);
    socket.leave(room.code);

    if (room.players.size === 0) {
      cancelRoomCleanup(room.code);
      deleteRoom(room.code);
    } else {
      emitRoomState(room);
    }
    broadcastRoomList();
    cb?.({ ok: true });
  });

  socket.on('room:kick-player', ({ targetId }, cb) => {
    const ctx = playerRoom.get(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'Not in a room' });
    const room = getRoom(ctx.roomCode);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });

    const result = room.removePlayerByHost(ctx.playerId, targetId);
    if (!result.ok) return cb?.(result);

    handlePlayerKicked(room, result);
    cb?.({ ok: true });
  });

  socket.on('room:join', ({ code, playerName }, cb) => {
    const room = getRoom(code);
    if (!room) {
      cb?.({ ok: false, error: 'Room not found' });
      return;
    }
    const id = crypto.randomUUID();
    const result = room.addPlayer(id, playerName?.trim() || 'Player', socket.id);
    if (!result.ok) {
      cb?.({ ok: false, error: result.error });
      return;
    }
    if (!room.onStateChange) bindRoom(room);
    playerRoom.set(socket.id, { roomCode: room.code, playerId: id });
    socket.join(room.code);
    cb?.({ ok: true, code: room.code, playerId: id });
    emitRoomState(room);
    broadcastRoomList();
  });

  socket.on('game:start', (_, cb) => {
    const ctx = playerRoom.get(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'Not in a room' });
    const room = getRoom(ctx.roomCode);
    if (!room || room.hostId !== ctx.playerId) {
      return cb?.({ ok: false, error: 'Only the host can start' });
    }
    const result = room.start();
    if (!result.ok) return cb?.(result);
    io.to(room.code).emit('game:started');
    emitRoomState(room);
    for (const p of room.players.values()) {
      const s = io.sockets.sockets.get(p.socketId);
      if (s) {
        s.emit('game:role', {
          role: p.role,
          roleLabel: ROLE_LABELS[p.role],
        });
        if (p.role === 'werewolf') {
          s.emit('game:wolf', room.wolfView(p.id));
        }
      }
    }
    broadcastRoomList();
    cb?.({ ok: true });
  });

  socket.on('night:wolf-vote', ({ targetId }, cb) => {
    const ctx = playerRoom.get(socket.id);
    const room = getRoom(ctx?.roomCode);
    if (!room) return cb?.({ ok: false, error: 'No room' });
    const result = room.wolfVote(ctx.playerId, targetId);
    if (result.ok) emitRoomState(room);
    cb?.(result);
  });

  socket.on('night:seer-check', ({ targetId }, cb) => {
    const ctx = playerRoom.get(socket.id);
    const room = getRoom(ctx?.roomCode);
    if (!room) return cb?.({ ok: false, error: 'No room' });
    const result = room.seerCheck(ctx.playerId, targetId);
    if (result.ok) {
      socket.emit('game:seer-result', {
        targetId,
        alignment: result.result,
        label: result.resultLabel,
      });
      if (room.phase !== PHASE.NIGHT_SEER) emitRoomState(room);
    }
    cb?.(result);
  });

  socket.on('night:witch', (payload, cb) => {
    const ctx = playerRoom.get(socket.id);
    const room = getRoom(ctx?.roomCode);
    if (!room) return cb?.({ ok: false, error: 'No room' });
    const result = room.witchAction(ctx.playerId, payload);
    if (result.ok) emitRoomState(room);
    cb?.(result);
  });

  socket.on('day:last-words-done', (_, cb) => {
    const ctx = playerRoom.get(socket.id);
    const room = getRoom(ctx?.roomCode);
    if (!room) return cb?.({ ok: false, error: 'No room' });
    const result = room.lastWordsDone(ctx.playerId);
    if (result.ok) emitRoomState(room);
    cb?.(result);
  });

  socket.on('day:skip-last-words', (_, cb) => {
    const ctx = playerRoom.get(socket.id);
    const room = getRoom(ctx?.roomCode);
    if (!room) return cb?.({ ok: false, error: 'No room' });
    const deadId = room.day.currentLastWordsPlayerId;
    const result = room.lastWordsDone(deadId);
    if (result.ok) emitRoomState(room);
    cb?.(result);
  });

  socket.on('day:discussion-done', (_, cb) => {
    const ctx = playerRoom.get(socket.id);
    const room = getRoom(ctx?.roomCode);
    if (!room) return cb?.({ ok: false, error: 'No room' });
    if (room.hostId !== ctx.playerId) {
      return cb?.({ ok: false, error: 'Host can skip the timer early' });
    }
    const result = room.beginVote();
    if (result.ok) emitRoomState(room);
    cb?.(result);
  });

  socket.on('day:vote', ({ targetId }, cb) => {
    const ctx = playerRoom.get(socket.id);
    const room = getRoom(ctx?.roomCode);
    if (!room) return cb?.({ ok: false, error: 'No room' });
    const result = room.castVote(ctx.playerId, targetId);
    if (result.ok) emitRoomState(room);
    cb?.(result);
  });

  socket.on('day:tie-speak-done', (_, cb) => {
    const ctx = playerRoom.get(socket.id);
    const room = getRoom(ctx?.roomCode);
    if (!room) return cb?.({ ok: false, error: 'No room' });
    if (room.hostId !== ctx.playerId) {
      return cb?.({ ok: false, error: 'Host can skip the timer early' });
    }
    room.clearDiscussionTimer();
    room.phase = PHASE.DAY_TIE_VOTE;
    room.day.votes.clear();
    room.log('Revote — everyone vote again.');
    room.refreshActionTimers();
    emitRoomState(room);
    cb?.({ ok: true });
  });

  socket.on('disconnect', () => {
    const ctx = playerRoom.get(socket.id);
    if (!ctx) return;
    const room = getRoom(ctx.roomCode);
    playerRoom.delete(socket.id);
    if (!room) return;

    const player = room.getPlayer(ctx.playerId);
    room.disconnectPlayer(ctx.playerId);

    if (room.connectedCount() === 0) {
      scheduleRoomCleanup(room.code);
    } else if (player) {
      room.log(`${player.name} disconnected (can rejoin on refresh).`);
      emitRoomState(room);
    }
    broadcastRoomList();
  });
});

const PORT = process.env.PORT || 5500;
httpServer.listen(PORT, () => {
  console.log(`Werewolf moderator running at http://localhost:${PORT}`);
});
