# Install Custom Mi Band 8 Apps with Suiteki Pro

This guide installs the two apps in this repo (`calculator.bin` and `dice-game.bin`) on **Xiaomi Smart Band 8 (standard model)** using **Suiteki Pro**.

## 1) Requirements

- Android phone (Suiteki Pro is Android-first for Bluetooth sideloading)
- Xiaomi Smart Band 8 already paired in Mi Fitness
- Suiteki Pro (latest version)
- Built `.bin` files from this project

## 2) Build the App Packages

From this repo root:

```bash
npm run build:all
```

If you see `no matching target devices`, run this once and rebuild:

```bash
npm run patch:devices
zeus build -t smart-band-7
```

You should get:

- `dist/calculator.bin`
- `dist/dice-game.bin`

Copy these files to your phone storage (Downloads is fine).

## 3) Initial Suiteki Setup

1. Install and open Suiteki Pro.
2. Grant required permissions:
   - Storage / files
   - Bluetooth / nearby devices
   - Location (needed for BLE scans on Android)
3. Tap the top blue authorization button.
4. Sign in with your Mi Fitness / Zepp account in Suiteki.

## 4) Add Your Band in Suiteki

1. Open **Device Management**.
2. Set model to **Xiaomi Smart Band 8** (standard), not 8 Pro.
3. Confirm the band Bluetooth name looks like `Xiaomi Smart Band 8 XXXX`.

## 5) Important Before Every Install

Force-stop Mi Fitness before starting Bluetooth install in Suiteki.

If Mi Fitness is still running, Suiteki often gets:

- `[Disconnect]`
- `[Authing]`
- install progress stuck at 0%

## 6) Install the App

1. Open **Bluetooth Install** in Suiteki.
2. Select your band.
3. Choose one file (`calculator.bin` or `dice-game.bin`).
4. Wait for transfer and band-side refresh/restart.
5. Open app list on band and launch the app.

## 7) Uninstall / Manage Apps

1. Open **Mini Program Management** in Suiteki.
2. Tap an installed app and uninstall it.
3. If an installed app is missing from list, use **Add App Info** manually:
   - App name
   - Package id

Package IDs used in this repo:

- Calculator: `com.custom.band8.calc`
- Dice game: `com.custom.band8.dice`

## 8) Troubleshooting

### `[Disconnect]` or `[Authing]`

- Force-stop Mi Fitness.
- Reconnect from Suiteki.
- Re-fetch auth key in Suiteki account/device flow.

### Device appears but cannot be selected

- Verify model is set to Band 8.
- Make sure Bluetooth name is correct.
- Turn Bluetooth off/on on phone and retry.

### Install hangs or never completes

- Retry with only one `.bin` file in queue.
- Keep phone screen awake during transfer.
- Use Suiteki log export and inspect error lines.

### App installed but missing on band

- Restart the band.
- Remove another app to free storage and reinstall.
- Reinstall with correct model selected.

## 9) Safety Notes

- Sideloading is community-based and can break after firmware changes.
- Wrong model selection can soft-brick app install behavior.
- Keep official firmware and Suiteki updated.
