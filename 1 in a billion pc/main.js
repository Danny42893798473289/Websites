"use strict";

const { app, BrowserWindow, Tray, Menu, shell, dialog, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");

let mainWindow = null;
let tray = null;
let gameUrl = "http://127.0.0.1:8787";

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function normalizeServerUrl(raw) {
  const trimmed = String(raw || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

function resolveServerUrl() {
  const fromEnv = normalizeServerUrl(process.env.EGG_SERVER_URL);
  if (fromEnv) return fromEnv;

  const candidates = [
    path.join(path.dirname(process.execPath), "server-url.json"),
    path.join(__dirname, "server-url.json"),
    app.isPackaged ? path.join(process.resourcesPath, "server-url.json") : null
  ].filter(Boolean);

  for (const filePath of candidates) {
    const parsed = readJsonFile(filePath);
    const url = normalizeServerUrl(parsed?.serverUrl);
    if (url) return url;
  }

  return "http://127.0.0.1:8787";
}

function healthCheck(baseUrl) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL("/api/health", baseUrl);
    } catch {
      resolve(false);
      return;
    }
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.get(url, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(4000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function createDefaultTrayIcon() {
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAI0lEQVQ4T2NkYGD4z0ABYBw1gGE0DBhGQ4NRCBiN" +
    "YGBg+A8AEGQAAfQm3E8AAAAASUVORK5CYII=";
  return nativeImage.createFromDataURL(`data:image/png;base64,${pngBase64}`);
}

function loadTrayIcon() {
  const candidates = [
    path.join(__dirname, "icon.png"),
    path.join(__dirname, "icon.ico")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const image = nativeImage.createFromPath(candidate);
      if (!image.isEmpty()) return image.resize({ width: 16, height: 16 });
    }
  }
  return createDefaultTrayIcon();
}

function createWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "Egg Roller Idle",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  mainWindow.loadURL(gameUrl);
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function reloadGame() {
  if (mainWindow) {
    mainWindow.loadURL(gameUrl);
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

function createTray() {
  tray = new Tray(loadTrayIcon());
  tray.setToolTip(`Egg Roller Idle — ${gameUrl}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open Game", click: () => createWindow() },
      { label: "Reload", click: () => reloadGame() },
      { label: "Open in Browser", click: () => shell.openExternal(gameUrl) },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ])
  );
  tray.on("double-click", () => createWindow());
}

app.whenReady().then(async () => {
  gameUrl = resolveServerUrl();
  const online = await healthCheck(gameUrl);
  if (!online) {
    const choice = dialog.showMessageBoxSync({
      type: "warning",
      title: "Egg Roller Idle",
      message: "Cannot reach the game server.",
      detail:
        `Tried: ${gameUrl}\n\n` +
        "Make sure the host is running node server.js and that server-url.json points to the right address.\n\n" +
        "Open anyway?",
      buttons: ["Open anyway", "Quit"],
      defaultId: 0,
      cancelId: 1
    });
    if (choice === 1) {
      app.quit();
      return;
    }
  }
  createTray();
  createWindow();
});

app.on("window-all-closed", () => {
  /* Stay in tray until Quit. */
});

app.on("before-quit", () => {
  app.isQuitting = true;
});
