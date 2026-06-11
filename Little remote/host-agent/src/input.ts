import type { InputEvent } from '@little-remote/shared';
import { screen } from 'electron';
import { codeToKey } from './keyboard-map.js';

type NutModule = typeof import('@nut-tree-fork/nut-js');
let nut: NutModule | null = null;

async function getNut(): Promise<NutModule> {
  if (!nut) {
    nut = await import('@nut-tree-fork/nut-js');
    nut.mouse.config.autoDelayMs = 0;
    nut.keyboard.config.autoDelayMs = 0;
  }
  return nut;
}

function getPrimaryDisplaySize(): { width: number; height: number } {
  const primary = screen.getPrimaryDisplay();
  const scale = primary.scaleFactor || 1;
  return {
    width: Math.round(primary.size.width * scale),
    height: Math.round(primary.size.height * scale),
  };
}

const pressedKeys = new Set<string>();
const pressedModifiers = new Set<string>();

function clampPixel(n: number, max: number): number {
  return Math.max(0, Math.min(max - 1, n));
}

export async function releaseAllKeys(): Promise<void> {
  const { keyboard, Key } = await getNut();
  for (const code of [...pressedKeys]) {
    const key = codeToKey(code, Key);
    if (key !== undefined) await keyboard.releaseKey(key);
  }
  pressedKeys.clear();
  for (const id of [...pressedModifiers]) {
    await keyboard.releaseKey(Number(id));
  }
  pressedModifiers.clear();
}

export async function handleInputEvent(event: InputEvent): Promise<void> {
  const { mouse, keyboard, Button, Point, Key } = await getNut();

  const { width, height } = getPrimaryDisplaySize();

  const toScreenCoords = (x: number, y: number) =>
    new Point(
      clampPixel(Math.round(x * width), width),
      clampPixel(Math.round(y * height), height)
    );

  const buttonFromNumber = (button: number) => {
    if (button === 2) return Button.RIGHT;
    if (button === 1) return Button.MIDDLE;
    return Button.LEFT;
  };

  const applyModifiers = async (
    ctrl: boolean,
    alt: boolean,
    shift: boolean,
    meta: boolean,
    down: boolean
  ) => {
    const mods: [boolean, number][] = [
      [ctrl, Key.LeftControl],
      [alt, Key.LeftAlt],
      [shift, Key.LeftShift],
      [meta, Key.LeftSuper],
    ];
    for (const [active, key] of mods) {
      const id = String(key);
      if (active && down && !pressedModifiers.has(id)) {
        await keyboard.pressKey(key);
        pressedModifiers.add(id);
      } else if (!active && pressedModifiers.has(id)) {
        await keyboard.releaseKey(key);
        pressedModifiers.delete(id);
      }
    }
  };

  const maybeMoveTo = async (x?: number, y?: number) => {
    if (x !== undefined && y !== undefined) {
      await mouse.setPosition(toScreenCoords(x, y));
    }
  };

  switch (event.type) {
    case 'mousemove': {
      await mouse.setPosition(toScreenCoords(event.x, event.y));
      break;
    }
    case 'mousemove-rel': {
      const pos = await mouse.getPosition();
      await mouse.setPosition(
        new Point(
          clampPixel(pos.x + Math.round(event.dx), width),
          clampPixel(pos.y + Math.round(event.dy), height)
        )
      );
      break;
    }
    case 'mousedown': {
      await maybeMoveTo(event.x, event.y);
      await mouse.pressButton(buttonFromNumber(event.button));
      break;
    }
    case 'mouseup': {
      await maybeMoveTo(event.x, event.y);
      await mouse.releaseButton(buttonFromNumber(event.button));
      break;
    }
    case 'wheel': {
      await mouse.setPosition(toScreenCoords(event.x, event.y));
      const steps = Math.round(Math.abs(event.deltaY) / 40) || 1;
      if (event.deltaY < 0) {
        for (let i = 0; i < steps; i++) await mouse.scrollUp(1);
      } else {
        for (let i = 0; i < steps; i++) await mouse.scrollDown(1);
      }
      break;
    }
    case 'keydown': {
      await applyModifiers(
        event.ctrlKey,
        event.altKey,
        event.shiftKey,
        event.metaKey,
        true
      );
      const key = codeToKey(event.code, Key);
      if (key !== undefined && !pressedKeys.has(event.code)) {
        await keyboard.pressKey(key);
        pressedKeys.add(event.code);
      } else if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        codeToKey(event.code, Key) === undefined
      ) {
        await keyboard.type(event.key);
      }
      break;
    }
    case 'keyup': {
      const key = codeToKey(event.code, Key);
      if (key !== undefined && pressedKeys.has(event.code)) {
        await keyboard.releaseKey(key);
        pressedKeys.delete(event.code);
      }
      await applyModifiers(
        event.ctrlKey,
        event.altKey,
        event.shiftKey,
        event.metaKey,
        false
      );
      break;
    }
    case 'release-all-keys': {
      await releaseAllKeys();
      break;
    }
  }
}

export function getScreenMeta(): { screenWidth: number; screenHeight: number } {
  const { width, height } = getPrimaryDisplaySize();
  return { screenWidth: width, screenHeight: height };
}
