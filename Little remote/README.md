# Little Remote

Remote desktop over the internet: Electron host shares your Windows screen; browser viewer (PC or phone) shows it and sends mouse/keyboard.

## Quick start

### 1. Install (once)

```powershell
cd "C:\Users\DannyLi\Desktop\Websites\Little remote"
npm install -w shared -w server -w viewer
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm install -w host-agent
npm run build -w shared
npm run build -w viewer
npm run build -w server
npm run build -w host-agent
```

### 2. Set your PIN (host PC)

Pick **4–8 digits** (e.g. `1234`). Any of:

- **Tray menu** → **Set PIN…** (saved for next time)
- **`host-agent\.env`**: `HOST_PIN=1234`
- **Root `.env`**: `HOST_PIN=1234`

If you skip this, a random PIN is generated each session (shown in the tray).

### 3. Run — two terminals

**Terminal A — server** (viewer + signaling on port **5500**):

```powershell
cd "C:\Users\DannyLi\Desktop\Websites\Little remote"
npm run start -w server
```

If port 5500 is busy:

```powershell
Get-NetTCPConnection -LocalPort 5500 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**Terminal B — host** (PC being controlled):

```powershell
cd "C:\Users\DannyLi\Desktop\Websites\Little remote"
$env:SIGNALING_URL="ws://localhost:5500"
npm run dev -w host-agent
```

Check the **system tray** (▲) for your PIN. Right-click for **Copy PIN** / **Copy viewer link**.

### 4. Connect — PC browser

Open **http://localhost:5500**, enter your PIN, click **Connect**. Click the video area to control the mouse; type on your keyboard.

---

## Mobile (phone / tablet)

1. Phone must reach the server (same Wi‑Fi for local use).
2. On the PC, find your LAN IP: `ipconfig` → IPv4 (e.g. `192.168.1.42`).
3. Allow **port 5500** in Windows Firewall for Node (private network).
4. On the phone browser open: **http://192.168.1.42:5500** (use your IP).
5. Enter the **same PIN** as the host tray.
6. Use the bottom toolbar:
   - **Tap** — left click at last touch position  
   - **Right** — right click  
   - **▲ / ▼** — scroll  
   - **⌨** — keyboard panel (type + Send text, Enter, Backspace, etc.)  
7. Drag on the screen to move the mouse; quick touch = click.

For access outside your home Wi‑Fi, deploy the server with HTTPS/WSS and TURN (see `deploy/DEPLOY.md`).

---

## Stop everything

```powershell
# Kill host tray apps
Get-CimInstance Win32_Process -Filter "Name='electron.exe'" | Where-Object { $_.CommandLine -match 'Little remote' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# Free port 5500
Get-NetTCPConnection -LocalPort 5500 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default **5500**) |
| `SIGNALING_URL` | Host WebSocket URL |
| `VITE_SIGNALING_URL` | Viewer build-time WebSocket URL |
| `VIEWER_URL` | Link copied from tray |
| `HOST_PIN` | Fixed host PIN (4–8 digits) |
| `TURN_*` | TURN relay for internet NAT |

---

## Build Windows installer

```powershell
npm run pack -w host-agent
```

Output: `host-agent/release/` (close other host instances first).
