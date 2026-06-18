# Egg Roller Idle — Windows client

Thin desktop app for your players. It does **not** run the game server — it opens your hosted game in a native window, same as the browser.

## How it works

```
You (host)                    Players
─────────                     ───────
node server.js  ◄───────────  EXE or browser
(port 8787)                   (same accounts & saves)
```

1. **You** keep `node server.js` running in `1 in a billion` (on your PC or a VPS).
2. **Players** install the EXE — it connects to your server URL.
3. Browser users can play at the same URL at the same time.

## Before you build the EXE

Edit **`server-url.json`** and set your server address:

```json
{
  "serverUrl": "http://192.168.1.50:8787"
}
```

Use your LAN IP for friends on the same WiFi, or your public IP/domain if port-forwarded.

Optional override when testing: `set EGG_SERVER_URL=http://127.0.0.1:8787`

## Dev run

```powershell
cd "1 in a billion pc"
npm install
npm start
```

Or double-click **`start.bat`**.

## Build for users

```powershell
npm run build
```

Outputs in `dist/`:

- `Egg Roller Idle Setup *.exe` — installer
- `Egg-Roller-Idle-Portable.exe` — single file, no install

Ship the EXE after you set `server-url.json` to your server. Players do not need Node.js.

## Host checklist

- Run `node server.js` in `1 in a billion` (listens on `0.0.0.0:8787` by default)
- Windows Firewall: allow inbound TCP **8787** if players are on other devices
- Port-forward **8787** on your router for internet play (optional)

## Changing server URL later

Edit `server-url.json` next to the installed `.exe`, or rebuild with a new URL baked in.
