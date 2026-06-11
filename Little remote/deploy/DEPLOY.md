# Deploying Little Remote for internet use

## 1. Signaling server

Deploy the `server` package to any Node host (VPS, Railway, Fly.io).

```bash
npm install
npm run build -w shared
npm run build -w viewer
npm run build -w server
PORT=5500 node server/dist/index.js
```

Set environment variables:

- `PORT=5500`
- `HOST=0.0.0.0`

Put HTTPS in front (Caddy, nginx, or platform TLS) so browsers can use `wss://`.

## 2. TURN server (coturn)

Many mobile/LTE ↔ home connections need TURN. On Ubuntu:

```bash
sudo apt install coturn
sudo cp deploy/coturn.conf.example /etc/turnserver.conf
# Edit user=, external-ip=, realm=
sudo systemctl enable coturn
sudo systemctl start coturn
```

In `.env`:

```
TURN_URL=turn:your-server.com:3478
TURN_USER=littleremote
TURN_PASS=YOUR_STRONG_PASSWORD
VITE_TURN_URL=turn:your-server.com:3478
VITE_TURN_USER=littleremote
VITE_TURN_PASS=YOUR_STRONG_PASSWORD
```

Rebuild viewer after setting `VITE_*` vars.

## 3. Host agent

On your Windows PC:

```
SIGNALING_URL=wss://your-domain
VIEWER_URL=https://your-domain
TURN_URL=...
TURN_USER=...
TURN_PASS=...
```

Run the installed host app or `npm run dev -w host-agent`.

## 4. Viewer

Open `https://your-domain`, enter the PIN from the host tray menu.
