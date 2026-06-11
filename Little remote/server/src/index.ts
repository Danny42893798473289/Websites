import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ClientRole, SignalingMessage } from '@little-remote/shared';
import { validatePin } from '@little-remote/shared';
import {
  createRoom,
  deleteRoom,
  getOtherPeer,
  getPeer,
  getRoom,
  relayToPeer,
  send,
  setPeer,
} from './rooms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 5500);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const viewerDist = path.join(__dirname, '../../viewer/dist');
app.use(express.static(viewerDist));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(viewerDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Viewer not built. Run: npm run build -w viewer');
  });
});

interface ClientState {
  pin: string | null;
  role: ClientRole | null;
}

wss.on('connection', (ws: WebSocket) => {
  const state: ClientState = { pin: null, role: null };

  ws.on('message', (raw) => {
    let msg: SignalingMessage;
    try {
      msg = JSON.parse(raw.toString()) as SignalingMessage;
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    switch (msg.type) {
      case 'create-room': {
        const result = createRoom(msg.pin);
        if ('error' in result) {
          send(ws, { type: 'error', message: result.error });
          return;
        }
        const pin = result.pin;
        state.pin = pin;
        state.role = 'host';
        const room = getRoom(pin)!;
        setPeer(room, 'host', { ws, role: 'host' });
        send(ws, { type: 'room-created', pin });
        send(ws, { type: 'joined', pin, role: 'host', peerPresent: false });
        break;
      }

      case 'join-room': {
        const pinErr = validatePin(msg.pin);
        if (pinErr) {
          send(ws, { type: 'error', message: pinErr });
          return;
        }
        const room = getRoom(msg.pin.trim());
        if (!room) {
          send(ws, { type: 'error', message: 'Room not found' });
          return;
        }
        const existing = getPeer(room, msg.role);
        if (existing) {
          send(ws, { type: 'error', message: `${msg.role} already connected` });
          return;
        }

        state.pin = msg.pin;
        state.role = msg.role;
        setPeer(room, msg.role, { ws, role: msg.role });

        const other = getOtherPeer(room, msg.role);
        send(ws, {
          type: 'joined',
          pin: msg.pin,
          role: msg.role,
          peerPresent: !!other,
        });

        if (other) {
          send(other.ws, { type: 'peer-joined', role: msg.role });
        }
        break;
      }

      case 'offer':
      case 'answer':
      case 'ice-candidate':
      case 'host-meta': {
        if (!state.pin || !state.role) {
          send(ws, { type: 'error', message: 'Not in a room' });
          return;
        }
        const room = getRoom(state.pin);
        if (!room) return;
        relayToPeer(room, state.role, msg);
        break;
      }

      default:
        send(ws, { type: 'error', message: 'Unknown message type' });
    }
  });

  ws.on('close', () => {
    if (!state.pin || !state.role) return;
    const room = getRoom(state.pin);
    if (!room) return;

    setPeer(room, state.role, null);
    const other = getOtherPeer(room, state.role);
    if (other) {
      send(other.ws, { type: 'peer-left' });
    }

    if (!room.host && !room.viewer) {
      deleteRoom(state.pin);
    }
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Little Remote server listening on http://${HOST}:${PORT}`);
  console.log(`WebSocket signaling: ws://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
