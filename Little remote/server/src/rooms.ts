import type { WebSocket } from 'ws';
import type { ClientRole, SignalingMessage } from '@little-remote/shared';
import { generatePin, validatePin } from '@little-remote/shared';

interface RoomPeer {
  ws: WebSocket;
  role: ClientRole;
}

interface Room {
  pin: string;
  host: RoomPeer | null;
  viewer: RoomPeer | null;
  createdAt: number;
}

const rooms = new Map<string, Room>();
const ROOM_TTL_MS = 60 * 60 * 1000;

export function createRoom(customPin?: string): { pin: string } | { error: string } {
  cleanupExpiredRooms();

  let pin: string;
  if (customPin !== undefined && customPin !== '') {
    const err = validatePin(customPin);
    if (err) return { error: err };
    pin = customPin.trim();
    if (rooms.has(pin) && (rooms.get(pin)!.host || rooms.get(pin)!.viewer)) {
      return { error: 'PIN already in use' };
    }
  } else {
    pin = generatePin();
    while (rooms.has(pin) && (rooms.get(pin)!.host || rooms.get(pin)!.viewer)) {
      pin = generatePin();
    }
  }

  rooms.set(pin, { pin, host: null, viewer: null, createdAt: Date.now() });
  return { pin };
}

export function getRoom(pin: string): Room | undefined {
  return rooms.get(pin);
}

export function deleteRoom(pin: string): void {
  rooms.delete(pin);
}

function cleanupExpiredRooms(): void {
  const now = Date.now();
  for (const [pin, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS && !room.host && !room.viewer) {
      rooms.delete(pin);
    }
  }
}

export function send(ws: WebSocket, message: SignalingMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function getPeer(room: Room, role: ClientRole): RoomPeer | null {
  return role === 'host' ? room.host : room.viewer;
}

export function setPeer(room: Room, role: ClientRole, peer: RoomPeer | null): void {
  if (role === 'host') room.host = peer;
  else room.viewer = peer;
}

export function getOtherPeer(room: Room, role: ClientRole): RoomPeer | null {
  return role === 'host' ? room.viewer : room.host;
}

export function relayToPeer(room: Room, fromRole: ClientRole, message: SignalingMessage): void {
  const peer = getOtherPeer(room, fromRole);
  if (peer) send(peer.ws, message);
}
