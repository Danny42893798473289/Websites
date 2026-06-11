import { validatePin } from '@little-remote/shared';
import { RemoteViewer } from './webrtc.js';
import { setupMobileControls, isMobileDevice } from './mobile.js';

const signalingUrl =
  import.meta.env.VITE_SIGNALING_URL ??
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;

const pinInput = document.getElementById('pin-input') as HTMLInputElement;
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const connectPanel = document.getElementById('connect-panel')!;
const remotePanel = document.getElementById('remote-panel')!;
const video = document.getElementById('remote-video') as HTMLVideoElement;
const overlay = document.getElementById('input-overlay') as HTMLElement;
const connectionLabel = document.getElementById('connection-label')!;
const gameModeBtn = document.getElementById('game-mode-btn');
const lanHint = document.getElementById('lan-hint');
const isMobile = isMobileDevice();

if (lanHint) {
  lanHint.textContent = `http://${location.hostname}:5500`;
}

if (isMobile) {
  document.body.classList.add('is-mobile');
}

let viewer: RemoteViewer | null = null;

function setStatus(text: string): void {
  statusEl.textContent = text;
  connectionLabel.textContent = text;
}

function setGameModeUi(on: boolean): void {
  gameModeBtn?.classList.toggle('active', on);
  document.body.classList.toggle('game-mode-active', on);
}

function toggleGameMode(): void {
  if (!viewer) return;
  const on = viewer.toggleGameMode();
  setGameModeUi(on);
}

async function connect(): Promise<void> {
  const pin = pinInput.value.trim();
  const pinErr = validatePin(pin);
  if (pinErr) {
    setStatus(pinErr);
    return;
  }

  connectBtn.disabled = true;
  setStatus('Connecting...');

  try {
    viewer = new RemoteViewer(video, overlay, setStatus, signalingUrl);
    await viewer.connect(pin);
    connectPanel.classList.add('hidden');
    remotePanel.classList.remove('hidden');
    setupMobileControls(viewer);
    setGameModeUi(false);
    overlay.focus();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Connection failed');
    connectBtn.disabled = false;
  }
}

function disconnect(): void {
  viewer?.disconnect();
  viewer = null;
  setGameModeUi(false);
  remotePanel.classList.add('hidden');
  connectPanel.classList.remove('hidden');
  connectBtn.disabled = false;
  pinInput.value = '';
  setStatus('Disconnected');
}

connectBtn.addEventListener('click', () => void connect());
disconnectBtn.addEventListener('click', disconnect);
if (!isMobile) {
  gameModeBtn?.addEventListener('click', toggleGameMode);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) viewer?.releaseAllKeys();
});

window.addEventListener('blur', () => {
  viewer?.releaseAllKeys();
});

window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement | null)?.tagName;
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA';

  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !inInput) {
    if (!connectPanel.classList.contains('hidden')) {
      e.preventDefault();
      void connect();
    }
    return;
  }

  if (!viewer) return;
  if (inInput) return;

  if ((e.key === 'g' || e.key === 'G') && !e.repeat) {
    e.preventDefault();
    toggleGameMode();
    return;
  }

  if (e.key === 'Escape' && viewer.isGameMode()) {
    e.preventDefault();
    viewer.setGameMode(false);
    setGameModeUi(false);
  }
});

const params = new URLSearchParams(location.search);
const pinParam = params.get('pin');
if (pinParam) {
  pinInput.value = pinParam;
}
