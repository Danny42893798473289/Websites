import { clamp01 } from './coords.js';

const STORAGE_KEY = 'lr-touch-calibration';

export interface TouchCalibration {
  dx: number;
  dy: number;
}

const DEFAULT_CAL: TouchCalibration = { dx: 0.04, dy: 0.06 };

export function loadTouchCalibration(): TouchCalibration {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TouchCalibration;
      if (
        Number.isFinite(parsed.dx) &&
        Number.isFinite(parsed.dy)
      ) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CAL };
}

export function saveTouchCalibration(cal: TouchCalibration): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cal));
}

/** UU Remote–style touch: drag moves cursor in parallel; tap teleports + auto-learns offset. */
export class MobileTouchControl {
  cursor = { x: 0.5, y: 0.5 };
  private cal: TouchCalibration;
  private anchorFinger = { x: 0, y: 0 };
  private anchorCursor = { x: 0.5, y: 0.5 };
  private active = false;

  /** How much each drag frame pulls cursor toward finger (auto offset correction). */
  private readonly dragPull = 0.22;
  private readonly maxCal = 0.28;

  constructor(
    private mapFinger: (clientX: number, clientY: number) => { x: number; y: number }
  ) {
    this.cal = loadTouchCalibration();
  }

  withCalibration(finger: { x: number; y: number }): { x: number; y: number } {
    return {
      x: clamp01(finger.x + this.cal.dx),
      y: clamp01(finger.y + this.cal.dy),
    };
  }

  /** Touch start — do not jump cursor (UU remote keeps offset until you drag). */
  pointerDown(clientX: number, clientY: number): null {
    const finger = this.mapFinger(clientX, clientY);
    this.anchorFinger = finger;
    this.anchorCursor = { ...this.cursor };
    this.active = true;
    return null;
  }

  /** Drag — move with finger; slowly correct up/left offset while dragging. */
  pointerMove(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.active) return null;

    const finger = this.mapFinger(clientX, clientY);
    const dragged = {
      x: this.anchorCursor.x + (finger.x - this.anchorFinger.x),
      y: this.anchorCursor.y + (finger.y - this.anchorFinger.y),
    };
    const target = this.withCalibration(finger);
    const x = clamp01(dragged.x + (target.x - dragged.x) * this.dragPull);
    const y = clamp01(dragged.y + (target.y - dragged.y) * this.dragPull);
    this.cursor = { x, y };
    return { x, y };
  }

  /** End touch — drag only; taps are handled separately. */
  pointerUp(): void {
    this.active = false;
  }

  resetCalibration(): void {
    this.cal = { ...DEFAULT_CAL };
    saveTouchCalibration(this.cal);
  }
}
