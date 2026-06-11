import 'dotenv/config';
import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  desktopCapturer,
  clipboard,
  screen,
} from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildIceServers } from '@little-remote/shared';
import type { InputEvent } from '@little-remote/shared';
import { handleInputEvent, getScreenMeta } from './input.js';
import { getSavedPin, savePin } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let pinWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let currentPin = '';

const SIGNALING_URL = process.env.SIGNALING_URL ?? 'ws://localhost:5500';

/** 16×16 blue icon — empty NativeImage hides the tray on Windows */
function createTrayIcon(): Electron.NativeImage {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAF0lEQVQ4T2NkYGD4z0ABYBzV0NDAAABJAAfQ3e5OAAAAAElFTkSuQmCC'
  );
  return icon.resize({ width: 16, height: 16 });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  tray = new Tray(createTrayIcon());
  updateTrayMenu();
}

function updateTrayMenu(): void {
  if (!tray) return;
  const pinLabel = currentPin ? `PIN: ${currentPin}` : 'Starting...';
  const menu = Menu.buildFromTemplate([
    { label: 'Little Remote Host', enabled: false },
    { label: pinLabel, enabled: false },
    {
      label: 'Set PIN…',
      click: () => openPinWindow(),
    },
    { type: 'separator' },
    {
      label: 'Copy PIN',
      enabled: !!currentPin,
      click: () => {
        if (currentPin) {
          clipboard.writeText(currentPin);
        }
      },
    },
    {
      label: 'Copy viewer link',
      enabled: !!currentPin,
      click: () => {
        const base = process.env.VIEWER_URL ?? 'http://localhost:5500';
        clipboard.writeText(`${base}?pin=${currentPin}`);
      },
    },
    { type: 'separator' },
    {
      label: 'Stop sharing',
      click: () => {
        mainWindow?.webContents.send('stop-sharing');
      },
    },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);
  tray.setToolTip(`Little Remote — ${pinLabel}`);
  tray.setContextMenu(menu);
}

function openPinWindow(): void {
  if (pinWindow) {
    pinWindow.focus();
    return;
  }
  pinWindow = new BrowserWindow({
    width: 340,
    height: 260,
    resizable: false,
    title: 'Little Remote — Set PIN',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  pinWindow.loadFile(path.join(__dirname, 'renderer', 'pin-window.html'));
  pinWindow.on('closed', () => {
    pinWindow = null;
    mainWindow?.webContents.send('stop-sharing');
  });
}

app.whenReady().then(() => {
  console.log('[Little Remote Host] Running — check system tray (▲) for PIN menu');
  console.log(`[Little Remote Host] Signaling: ${SIGNALING_URL}`);
  createWindow();
  createTray();

  if (!getSavedPin()) {
    openPinWindow();
  }

  ipcMain.handle('get-desktop-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 0, height: 0 },
    });
    return sources.map((s) => ({ id: s.id, name: s.name }));
  });

  ipcMain.handle('get-screen-meta', () => getScreenMeta());

  ipcMain.handle('get-signaling-url', () => SIGNALING_URL);

  ipcMain.handle('get-ice-config', () =>
    buildIceServers({
      turnUrl: process.env.TURN_URL,
      turnUser: process.env.TURN_USER,
      turnPass: process.env.TURN_PASS,
    })
  );

  ipcMain.handle('get-host-pin', () => getSavedPin());

  ipcMain.handle('save-host-pin', (_e, pin: string) => {
    const result = savePin(pin);
    if (result.ok) {
      mainWindow?.webContents.send('stop-sharing');
    }
    return result;
  });

  ipcMain.on('input-event', (_e, event: InputEvent) => {
    handleInputEvent(event).catch(console.error);
  });

  ipcMain.on('pin-update', (_e, pin: string) => {
    currentPin = pin;
    updateTrayMenu();
  });

  ipcMain.on('status-update', (_e, status: string) => {
    if (tray && currentPin) {
      tray.setToolTip(`Little Remote — PIN: ${currentPin} (${status})`);
    }
  });
});

app.on('window-all-closed', () => {
  /* keep running in tray */
});
