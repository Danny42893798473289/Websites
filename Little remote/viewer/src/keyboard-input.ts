import type { InputEvent } from '@little-remote/shared';

export function keyboardEventToInput(
  type: 'keydown' | 'keyup',
  e: KeyboardEvent
): InputEvent {
  return {
    type,
    key: e.key,
    code: e.code,
    ctrlKey: e.ctrlKey,
    altKey: e.altKey,
    shiftKey: e.shiftKey,
    metaKey: e.metaKey,
  };
}

/** Keys games use — block browser shortcuts while game mode is active. */
const GAME_KEY_CODES = new Set([
  'Space',
  'Tab',
  'Escape',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyE',
  'KeyQ',
  'KeyR',
  'KeyF',
  'KeyC',
  'KeyV',
  'KeyB',
  'KeyM',
  'KeyT',
  'KeyG',
  'KeyZ',
  'KeyX',
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  'Digit0',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
]);

export function shouldCaptureGameKey(e: KeyboardEvent): boolean {
  if (GAME_KEY_CODES.has(e.code)) return true;
  if (e.code.startsWith('Key') || e.code.startsWith('Digit')) return true;
  if (e.code.startsWith('Numpad')) return true;
  return false;
}

export function sendKeyTap(
  send: (ev: InputEvent) => void,
  key: string,
  code: string,
  modifiers?: Partial<{
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
  }>
): void {
  const base = {
    key,
    code,
    ctrlKey: modifiers?.ctrlKey ?? false,
    altKey: modifiers?.altKey ?? false,
    shiftKey: modifiers?.shiftKey ?? false,
    metaKey: modifiers?.metaKey ?? false,
  };
  send({ type: 'keydown', ...base });
  send({ type: 'keyup', ...base });
}
