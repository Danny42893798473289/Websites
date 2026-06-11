# Mi Band 8 Custom Apps

This workspace contains two custom apps for Xiaomi Smart Band 8 (standard model):

- `calculator` (utility app)
- `dice-game` (simple game)

These apps are built with the community-proven Zeus workflow and exported as `.bin` files for Bluetooth installation through Suiteki Pro.

## Prerequisites

- Node.js 18+
- npm
- Zeus CLI:
  - `npm install -g @zeppos/zeus-cli`
- Android phone with Suiteki Pro for install

## Project Structure

- `apps/calculator`: calculator mini app
- `apps/dice-game`: dice roller mini app
- `scripts/patch-zeus-devices.js`: adds Mi Band device sources to Zeus cache (required on Zeus 1.9+)
- `scripts/extract-device-bin.js`: converts build outputs into Suiteki-ready `.bin`
- `INSTALL-SUITEKI.md`: end-to-end install and troubleshooting guide

## Build All (recommended)

From repo root:

```bash
npm run build:all
```

This will:

1. Patch Zeus device cache for Mi Band sources
2. Build both apps with `zeus build -t smart-band-7`
3. Extract `dist/calculator.bin` and `dist/dice-game.bin`

## Build One App

### Calculator

```bash
npm run build:calculator
npm run extract:calculator
```

### Dice Game

```bash
npm run build:dice-game
npm run extract:dice-game
```

Then move those `.bin` files to your Android phone and follow `INSTALL-SUITEKI.md`.

## Build Troubleshooting

### `no matching target devices`

Zeus 1.9+ no longer ships Mi Band 7/8 device sources by default. Run:

```bash
npm run patch:devices
```

Then rebuild with:

```bash
zeus build -t smart-band-7
```

### `page/index.js does not exist`

Use `page/index.js` (not `page/index.page.js`) in this repo. Zeus 1.9 expects the `.js` filename.

### PNG icon errors during build

App icons must be valid RGB PNG files (96x96). Place them at:

- `apps/<app>/icon.png`
- `apps/<app>/assets/smart-band-7/icon.png`
