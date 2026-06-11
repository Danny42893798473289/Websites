# The Password Game (China-friendly clone)

An offline, self-hosted clone of [neal.fun/password-game](https://neal.fun/password-game/) with **local autosave**. No Google Maps, reCAPTCHA, Wordle API, or other blocked services — works in mainland China.

## Features

- All 35 rules from the original game
- Progress autosaves to `localStorage` (password, unlocked rules, game state)
- Local CAPTCHA, chess puzzles, country flags, Wordle word (date-based), moon phase calculation
- Bilibili + YouTube video URL examples for the video-length rule
- Rich-text formatting toolbar for late-game font rules
- Paul the chicken, fire, worm feeding, letter sacrifice, and final retype challenge

## Run locally

Open `index.html` in any modern browser, or serve the folder:

```bash
# Python
python -m http.server 8080

# Node (npx)
npx serve .
```

Then visit `http://localhost:8080`.

## Reset progress

Click **Reset saved progress** in the footer, or clear `localStorage` key `password-game-save-v1`.

## Files

```
index.html      — page structure
css/style.css   — styling
js/data.js      — game data (elements, countries, chess, videos)
js/utils.js     — helpers (roman numerals, moon phase, formatting)
js/rules.js     — all 35 rule definitions
js/app.js       — UI, autosave, timers, modals
```

## Notes

- Inspired by Neal Agarwal's original. This is an unofficial fan clone for offline/educational use.
- Video rule accepts URLs from the built-in list (includes Bilibili links for China).
- Rule 35 requires the current time — it updates as the clock changes, like the original.
