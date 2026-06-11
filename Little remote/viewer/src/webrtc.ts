import { buildIceServers } from '@little-remote/shared';
import type { InputEvent, SignalingMessage } from '@little-remote/shared';
import { pointerClientCoords, pointerToNormalized } from './coords.js';
import { GameModeController } from './game-mode.js';
import {
  keyboardEventToInput,
  shouldCaptureGameKey,
} from './keyboard-input.js';
import { isMobileDevice } from './mobile.js';
import { SignalingClient } from './signaling.js';
import { MobileTouchControl } from './touch-control.js';

function getIceConfig() {
  return buildIceServers({
    turnUrl: import.meta.env.VITE_TURN_URL,
    turnUser: import.meta.env.VITE_TURN_USER,
    turnPass: import.meta.env.VITE_TURN_PASS,
  });
}

export class RemoteViewer {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private signaling: SignalingClient;
  private sendFn: ((event: InputEvent) => void) | null = null;
  private lastTouch = { x: 0.5, y: 0.5 };
  readonly gameMode: GameModeController;
  private keyCaptureAbort: AbortController | null = null;

  constructor(
    private video: HTMLVideoElement,
    private overlay: HTMLElement,
    private onStatus: (s: string) => void,
    signalingUrl: string
  ) {
    this.signaling = new SignalingClient(signalingUrl);
    this.gameMode = new GameModeController(overlay, (dx, dy) => {
      this.sendFn?.({ type: 'mousemove-rel', dx, dy });
    }, onStatus);
  }

  toggleGameMode(): boolean {
    if (this.gameMode.active) {
      this.setGameMode(false);
      return false;
    }
    this.setGameMode(true);
    return true;
  }

  setGameMode(on: boolean): void {
    if (on) {
      this.gameMode.enable();
      this.sendFn?.({ type: 'mousemove', x: 0.5, y: 0.5 });
      this.lastTouch = { x: 0.5, y: 0.5 };
      this.attachGameKeyboard();
      this.overlay.focus();
      if (!isMobileDevice() && 'pointerLockElement' in document) {
        void this.overlay.requestPointerLock();
      }
    } else {
      this.gameMode.disable();
      this.sendFn?.({ type: 'release-all-keys' });
      this.detachGameKeyboard();
    }
  }

  isGameMode(): boolean {
    return this.gameMode.active;
  }

  private attachGameKeyboard(): void {
    this.detachGameKeyboard();
    const ac = new AbortController();
    this.keyCaptureAbort = ac;
    const opts = { capture: true, signal: ac.signal };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!this.gameMode.active) return;
      if (shouldCaptureGameKey(e) || e.code.startsWith('Key') || e.code.startsWith('Digit')) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key === 'Escape' && document.pointerLockElement !== this.overlay) {
        return;
      }
      this.sendFn?.(keyboardEventToInput('keydown', e));
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!this.gameMode.active) return;
      if (shouldCaptureGameKey(e) || e.code.startsWith('Key') || e.code.startsWith('Digit')) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.sendFn?.(keyboardEventToInput('keyup', e));
    };

    window.addEventListener('keydown', onKeyDown, opts);
    window.addEventListener('keyup', onKeyUp, opts);
    this.overlay.addEventListener('keydown', onKeyDown, opts);
    this.overlay.addEventListener('keyup', onKeyUp, opts);
  }

  private detachGameKeyboard(): void {
    this.keyCaptureAbort?.abort();
    this.keyCaptureAbort = null;
  }

  /** Send mouse/keyboard event to host (for mobile toolbar). */
  sendInput(event: InputEvent): void {
    this.sendFn?.(event);
  }

  releaseAllKeys(): void {
    this.sendFn?.({ type: 'release-all-keys' });
  }

  getLastTouchCoords(): { x: number; y: number } {
    return { ...this.lastTouch };
  }

  async connect(pin: string): Promise<void> {
    await this.signaling.connect();
    this.setupSignalingHandlers();
    this.signaling.send({ type: 'join-room', pin, role: 'viewer' });
    this.onStatus('Waiting for host...');
  }

  private setupSignalingHandlers(): void {
    this.signaling.on('joined', async (msg) => {
      if (msg.type !== 'joined') return;
      if (msg.peerPresent) {
        this.onStatus('Host found, negotiating...');
      } else {
        this.onStatus('Waiting for host to connect...');
      }
    });

    this.signaling.on('peer-joined', async (msg) => {
      if (msg.type !== 'peer-joined' || msg.role !== 'host') return;
      this.onStatus('Host connected, waiting for stream...');
    });

    this.signaling.on('offer', async (msg) => {
      if (msg.type !== 'offer') return;
      await this.handleOffer(msg.sdp);
    });

    this.signaling.on('ice-candidate', async (msg) => {
      if (msg.type !== 'ice-candidate' || !this.pc) return;
      await this.pc.addIceCandidate(msg.candidate);
    });

    this.signaling.on('peer-left', () => {
      this.onStatus('Host disconnected');
      this.cleanup();
    });

    this.signaling.on('error', (msg) => {
      if (msg.type === 'error') this.onStatus(msg.message);
    });
  }

  private async handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    this.cleanupPeer();
    this.pc = new RTCPeerConnection({ iceServers: getIceConfig() });

    this.pc.ontrack = (ev) => {
      this.video.srcObject = ev.streams[0] ?? null;
      this.onStatus('Streaming');
      void this.video.play().catch(() => {});
    };

    this.pc.ondatachannel = (ev) => {
      this.dc = ev.channel;
    };

    this.pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.signaling.send({ type: 'ice-candidate', candidate: ev.candidate.toJSON() });
      }
    };

    await this.pc.setRemoteDescription(sdp);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.signaling.send({ type: 'answer', sdp: answer });

    this.gameMode.setup();
    this.setupInputCapture();
  }

  private setupInputCapture(): void {
    const send = (event: InputEvent) => {
      if (this.dc?.readyState === 'open') {
        this.dc.send(JSON.stringify(event));
      }
    };
    this.sendFn = send;

    const touchMode = isMobileDevice();
    const touchCtrl = touchMode
      ? new MobileTouchControl((clientX, clientY) =>
          pointerToNormalized(
            this.overlay,
            this.video,
            clientX,
            clientY,
            true
          )
        )
      : null;

    const mapPointer = (e: PointerEvent) => {
      const { x: cx, y: cy } = pointerClientCoords(e);
      return pointerToNormalized(
        this.overlay,
        this.video,
        cx,
        cy,
        touchMode
      );
    };

    const moveNow = (x: number, y: number) => {
      this.lastTouch = { x, y };
      if (touchCtrl) touchCtrl.cursor = { x, y };
      send({ type: 'mousemove', x, y });
    };

    /** Click at position without moving the cursor first. */
    const clickOnly = (x: number, y: number, button: number) => {
      this.lastTouch = { x, y };
      if (touchCtrl) touchCtrl.cursor = { x, y };
      send({ type: 'mousedown', x, y, button });
      send({ type: 'mouseup', x, y, button });
    };

    const clickAtCurrent = (button: number) => {
      send({ type: 'mousedown', button });
      send({ type: 'mouseup', button });
    };

    let activePointerId: number | null = null;
    const TAP_PX = 14;

    type TouchPointer = { startX: number; startY: number; moved: boolean };
    const touchPointers = new Map<number, TouchPointer>();
    let gestureMoved = false;
    let gestureMaxFingers = 0;
    let lastTapCoords = { x: 0.5, y: 0.5 };
    let lastTouchPx = { x: 0, y: 0 };
    let lookPointerId: number | null = null;

    const mapTouchCoords = (clientX: number, clientY: number) =>
      pointerToNormalized(this.overlay, this.video, clientX, clientY, touchMode);

    const finishTouchGesture = () => {
      if (!gestureMoved) {
        if (gestureMaxFingers >= 2) {
          clickOnly(lastTapCoords.x, lastTapCoords.y, 2);
        } else if (gestureMaxFingers === 1) {
          clickOnly(lastTapCoords.x, lastTapCoords.y, 0);
        }
      }
      gestureMoved = false;
      gestureMaxFingers = 0;
      lookPointerId = null;
      touchCtrl?.pointerUp();
    };

    this.overlay.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType === 'touch') {
          e.preventDefault();
          const { x: cx, y: cy } = pointerClientCoords(e);
          lastTapCoords = mapTouchCoords(cx, cy);
          lastTouchPx = { x: cx, y: cy };
          touchPointers.set(e.pointerId, {
            startX: cx,
            startY: cy,
            moved: false,
          });
          gestureMaxFingers = Math.max(gestureMaxFingers, touchPointers.size);

          if (this.gameMode.active) {
            if (touchPointers.size === 1) lookPointerId = e.pointerId;
            this.overlay.focus();
            return;
          }

          if (touchPointers.size === 1 && touchCtrl) {
            touchCtrl.pointerDown(cx, cy);
          }
          return;
        }

        e.preventDefault();
        this.overlay.setPointerCapture(e.pointerId);
        activePointerId = e.pointerId;

        if (this.gameMode.active && e.pointerType === 'mouse') {
          this.overlay.focus();
          if (!this.gameMode.pointerLocked) return;
          clickAtCurrent(e.button);
          return;
        }

        const { x, y } = mapPointer(e);
        moveNow(x, y);
        send({ type: 'mousedown', x, y, button: e.button });
        this.overlay.focus();
      },
      { passive: false }
    );

    this.overlay.addEventListener(
      'pointermove',
      (e) => {
        if (this.gameMode.handlePointerMove(e)) return;

        if (e.pointerType === 'touch') {
          const tp = touchPointers.get(e.pointerId);
          if (!tp) return;

          const { x: cx, y: cy } = pointerClientCoords(e);
          if (Math.hypot(cx - tp.startX, cy - tp.startY) > TAP_PX) {
            tp.moved = true;
            gestureMoved = true;
          }
          lastTapCoords = mapTouchCoords(cx, cy);

          if (this.gameMode.active && gestureMoved && e.pointerId === lookPointerId) {
            const dx = cx - lastTouchPx.x;
            const dy = cy - lastTouchPx.y;
            lastTouchPx = { x: cx, y: cy };
            if (dx !== 0 || dy !== 0) {
              this.gameMode.handleTouchDelta(dx, dy);
            }
            return;
          }

          if (!this.gameMode.active && touchPointers.size === 1 && touchCtrl) {
            const pos = touchCtrl.pointerMove(cx, cy);
            if (pos) moveNow(pos.x, pos.y);
          }
          return;
        }

        if (this.gameMode.active) return;

        const { x, y } = mapPointer(e);
        moveNow(x, y);
      },
      { passive: true }
    );

    this.overlay.addEventListener(
      'pointerup',
      (e) => {
        if (e.pointerType === 'touch') {
          e.preventDefault();
          const { x: cx, y: cy } = pointerClientCoords(e);
          lastTapCoords = mapTouchCoords(cx, cy);
          touchPointers.delete(e.pointerId);
          if (lookPointerId === e.pointerId) lookPointerId = null;

          if (touchPointers.size === 0) {
            finishTouchGesture();
          }
          return;
        }

        if (activePointerId !== null && e.pointerId !== activePointerId) return;
        activePointerId = null;
        this.overlay.releasePointerCapture(e.pointerId);

        if (this.gameMode.active && e.pointerType === 'mouse') {
          if (this.gameMode.pointerLocked) {
            clickAtCurrent(e.button);
          }
          return;
        }

        const { x, y } = mapPointer(e);
        send({ type: 'mouseup', x, y, button: e.button });
      },
      { passive: false }
    );

    this.overlay.addEventListener(
      'pointercancel',
      (e) => {
        if (e.pointerType === 'touch') {
          touchPointers.delete(e.pointerId);
          if (lookPointerId === e.pointerId) lookPointerId = null;
          if (touchPointers.size === 0) finishTouchGesture();
          return;
        }
        if (e.pointerId === activePointerId) activePointerId = null;
      },
      { passive: true }
    );

    this.overlay.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const { x, y } = pointerToNormalized(
          this.overlay,
          this.video,
          e.clientX,
          e.clientY,
          false
        );
        send({ type: 'wheel', x, y, deltaX: e.deltaX, deltaY: e.deltaY });
      },
      { passive: false }
    );

    this.overlay.addEventListener('keydown', (e) => {
      if (this.gameMode.active) return;
      e.preventDefault();
      send(keyboardEventToInput('keydown', e));
    });

    this.overlay.addEventListener('keyup', (e) => {
      if (this.gameMode.active) return;
      e.preventDefault();
      send(keyboardEventToInput('keyup', e));
    });
  }

  disconnect(): void {
    this.setGameMode(false);
    this.cleanup();
    this.signaling.close();
  }

  private cleanupPeer(): void {
    this.detachGameKeyboard();
    this.sendFn = null;
    this.dc?.close();
    this.dc = null;
    this.pc?.close();
    this.pc = null;
    this.video.srcObject = null;
  }

  private cleanup(): void {
    this.cleanupPeer();
  }
}
