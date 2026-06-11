/** Pointer-lock game mode (Minecraft-style look). */
export class GameModeController {
  active = false;
  /** Multiplier for movementX/Y (desktop pointer lock). */
  mouseSensitivity = 1;
  /** Touch look sensitivity (pixels sent per finger pixel). */
  touchSensitivity = 1.8;
  pointerLocked = false;

  constructor(
    private overlay: HTMLElement,
    private onRelativeMove: (dx: number, dy: number) => void,
    private onStatus?: (msg: string) => void
  ) {}

  setup(): void {
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.overlay;
      this.overlay.classList.toggle('pointer-locked', this.pointerLocked);
      if (this.active) {
        this.onStatus?.(
          this.pointerLocked
            ? 'Game mode — cursor locked (Esc to unlock)'
            : 'Game mode — click screen to lock cursor'
        );
      }
    });

    this.overlay.addEventListener('click', () => {
      if (!this.active || this.pointerLocked) return;
      if (!('pointerLockElement' in document)) {
        this.onStatus?.('Pointer lock not supported in this browser');
        return;
      }
      void this.overlay.requestPointerLock();
    });
  }

  enable(): void {
    this.active = true;
    document.body.classList.add('game-mode');
    this.onStatus?.('Game mode — click screen to lock cursor');
  }

  disable(): void {
    this.exitPointerLock();
    this.active = false;
    this.pointerLocked = false;
    this.overlay.classList.remove('pointer-locked');
    document.body.classList.remove('game-mode');
  }

  exitPointerLock(): void {
    if (document.pointerLockElement === this.overlay) {
      document.exitPointerLock();
    }
  }

  /** Desktop pointer lock relative movement. Returns true if handled. */
  handlePointerMove(e: PointerEvent): boolean {
    if (!this.active || !this.pointerLocked) return false;
    if (e.movementX === 0 && e.movementY === 0) return true;
    this.onRelativeMove(
      e.movementX * this.mouseSensitivity,
      e.movementY * this.mouseSensitivity
    );
    return true;
  }

  /** Mobile / fallback: finger delta in screen pixels → host pixels. */
  handleTouchDelta(dx: number, dy: number): void {
    if (!this.active) return;
    this.onRelativeMove(dx * this.touchSensitivity, dy * this.touchSensitivity);
  }

  usesRelativeTouch(): boolean {
    return this.active && !this.pointerLocked;
  }
}
