import type { RemoteViewer } from './webrtc.js';

export function setupMobileControls(viewer: RemoteViewer): void {
  const bar = document.getElementById('mobile-bar');
  const keyboardPanel = document.getElementById('keyboard-panel');
  const gameKeysPanel = document.getElementById('game-keys-panel');
  const keyboardInput = document.getElementById('mobile-keyboard-input') as HTMLInputElement;
  const gameModeBtnMobile = document.getElementById('game-mode-btn-mobile');
  if (!bar) return;

  const send = (ev: Parameters<RemoteViewer['sendInput']>[0]) => viewer.sendInput(ev);

  const scrollAt = (deltaY: number) => {
    const { x, y } = viewer.getLastTouchCoords();
    send({ type: 'wheel', x, y, deltaX: 0, deltaY });
  };

  const heldCodes = new Set<string>();
  const modifiers = {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
  };

  const modButtons = document.querySelectorAll<HTMLElement>('[data-modifier]');
  const updateModifierUi = () => {
    modButtons.forEach((btn) => {
      const name = btn.dataset.modifier as keyof typeof modifiers;
      btn.classList.toggle('active', !!modifiers[name]);
    });
  };

  const sendKey = (
    key: string,
    code: string,
    keyMods?: Partial<typeof modifiers>
  ) => {
    const merged = { ...modifiers, ...keyMods };
    send({ type: 'keydown', key, code, ...merged });
    send({ type: 'keyup', key, code, ...merged });
  };

  const bindGameKey = (root: ParentNode, holdable = false) => {
    root.querySelectorAll('[data-key]').forEach((btn) => {
      const code = btn.getAttribute('data-code') ?? '';
      const key = btn.getAttribute('data-key') ?? '';
      const shift = btn.getAttribute('data-shift') === 'true';
      const fixedMods = {
        ctrlKey: false,
        altKey: false,
        shiftKey: shift,
        metaKey: false,
      };

      const press = () => {
        if (heldCodes.has(code)) return;
        heldCodes.add(code);
        send({ type: 'keydown', key, code, ...modifiers, ...fixedMods });
      };

      const release = () => {
        if (!heldCodes.has(code)) return;
        heldCodes.delete(code);
        send({ type: 'keyup', key, code, ...modifiers, ...fixedMods });
      };

      if (holdable) {
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          const pe = e as PointerEvent;
          (e.target as HTMLElement).setPointerCapture?.(pe.pointerId);
          press();
        });
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointercancel', release);
        btn.addEventListener('pointerleave', release);
        return;
      }

      btn.addEventListener('click', () =>
        sendKey(key, code, fixedMods)
      );
    });
  };

  const toggleGameModeUi = (on: boolean) => {
    document.body.classList.toggle('game-mode-active', on);
    gameModeBtnMobile?.classList.toggle('active', on);
    if (on) {
      keyboardPanel?.classList.remove('open');
      gameKeysPanel?.classList.add('open');
    } else {
      gameKeysPanel?.classList.remove('open');
    }
  };

  const toggleGame = () => {
    const on = viewer.toggleGameMode();
    toggleGameModeUi(on);
  };

  gameModeBtnMobile?.addEventListener('click', toggleGame);

  modButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.modifier as keyof typeof modifiers;
      modifiers[name] = !modifiers[name];
      updateModifierUi();
    });
  });

  bar.querySelector('[data-action="scroll-up"]')?.addEventListener('click', () => scrollAt(-120));
  bar.querySelector('[data-action="scroll-down"]')?.addEventListener('click', () => scrollAt(120));

  bar.querySelector('[data-action="keyboard"]')?.addEventListener('click', () => {
    if (viewer.isGameMode()) return;
    keyboardPanel?.classList.toggle('open');
    if (keyboardPanel?.classList.contains('open')) {
      keyboardInput?.focus();
    }
  });

  bar.querySelector('[data-action="game-keys"]')?.addEventListener('click', () => {
    gameKeysPanel?.classList.toggle('open');
    keyboardPanel?.classList.remove('open');
  });

  bindGameKey(bar);
  if (gameKeysPanel) bindGameKey(gameKeysPanel, true);
  if (keyboardPanel) bindGameKey(keyboardPanel);

  keyboardInput?.addEventListener('input', () => {
    const value = keyboardInput.value;
    if (!value) return;
    const char = value.slice(-1);
    keyboardInput.value = '';
    sendKey(char, char.length === 1 ? `Key${char.toUpperCase()}` : '');
  });

  keyboardInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendKey('Enter', 'Enter');
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      sendKey('Backspace', 'Backspace');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      sendKey('Tab', 'Tab');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      sendKey('Escape', 'Escape');
    }
  });

  document.querySelector('[data-action="send-text"]')?.addEventListener('click', () => {
    const text = keyboardInput?.value ?? '';
    if (!text) return;
    for (const char of text) {
      if (char === '\n') {
        sendKey('Enter', 'Enter');
      } else {
        sendKey(char, char.length === 1 ? `Key${char.toUpperCase()}` : '');
      }
    }
    keyboardInput.value = '';
  });

  updateModifierUi();
}

export function isMobileDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(max-width: 768px)').matches
  );
}
