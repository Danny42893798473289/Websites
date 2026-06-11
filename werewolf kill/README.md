# Werewolf Kill — 6-Player Standard

Online **6-player Werewolf** where the **server is the moderator**. Built for friend gatherings: simple roles, real deduction, ~10–20 minute games.

## Roles (standard setup)

| Role | Count |
|------|-------|
| Werewolf | 2 |
| Seer | 1 |
| Witch | 1 |
| Villager | 2 |

## Run locally

```bash
npm install
npm start
```

Open **http://localhost:5500** on each player’s phone or laptop (same Wi‑Fi / network).

1. Enter your name, then **create a room** or **join from the open room list** (no code typing needed).
2. Lobby chat while waiting — need exactly **6 players**.
3. Host taps **Start game** — roles are dealt in secret by the server.
4. **Type in chat** during discussion (3‑minute timer), voting, last words, and lobby. Wolves get private pack chat at night.

## Server as moderator

The server runs the official script flow:

- **Night:** Werewolves → Seer → Witch (heal / poison)
- **Day:** Death announcement → last words → discussion → vote (with tie revote rules)
- **Win:** Good eliminates all wolves, or wolves ≥ good players

### Rules implemented

- Witch: one heal and one poison, each once; **self-save allowed on the first night only**
- Werewolves must **agree** on the same kill target
- Vote tie: tied players speak again → revote → if still tied, **no elimination**
- Dead players may give **last words** (night deaths and vote eliminations)
- No sheriff; 6-player balance only

## Tips

- Use a **dedicated host device** for the room code, or let one player create the room and start the game.
- Play in a **quiet** space; use discussion in person while phones show private night UI.
- Recommended: treat the game as **in-game logic only** (no real-life oaths or outside tells).

## Development

```bash
npm run dev
```

Uses Node 18+ with `--watch` for auto-restart.

## Tech

- Node.js, Express, Socket.IO
- Vanilla HTML/CSS/JS client
