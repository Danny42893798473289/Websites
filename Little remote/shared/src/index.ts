export type ClientRole = 'host' | 'viewer';

export type SignalingMessage =
  | { type: 'create-room'; pin?: string }
  | { type: 'room-created'; pin: string }
  | { type: 'join-room'; pin: string; role: ClientRole }
  | { type: 'joined'; pin: string; role: ClientRole; peerPresent: boolean }
  | { type: 'peer-joined'; role: ClientRole }
  | { type: 'peer-left' }
  | { type: 'error'; message: string }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit }
  | { type: 'host-meta'; screenWidth: number; screenHeight: number };

export type InputEvent =
  | { type: 'mousemove'; x: number; y: number }
  /** Relative mouse move in host pixels (Minecraft / pointer-lock style). */
  | { type: 'mousemove-rel'; dx: number; dy: number }
  | { type: 'mousedown'; button: number; x?: number; y?: number }
  | { type: 'mouseup'; button: number; x?: number; y?: number }
  | { type: 'wheel'; x: number; y: number; deltaX: number; deltaY: number }
  | { type: 'keydown'; key: string; code: string; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean }
  | { type: 'keyup'; key: string; code: string; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean }
  | { type: 'release-all-keys' };

export { buildIceServers, type IceConfig } from './ice.js';

export function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Validates PIN for create/join (4–8 digits). Returns error message or null if ok. */
export function validatePin(pin: string): string | null {
  const trimmed = pin.trim();
  if (!/^\d{4,8}$/.test(trimmed)) {
    return 'PIN must be 4–8 digits';
  }
  return null;
}
