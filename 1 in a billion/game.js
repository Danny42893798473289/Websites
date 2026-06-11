/* Egg Roller Idle — game logic has moved to ES modules under js/
 *
 * Entry point: js/main.js (loaded from index.html)
 *
 * Module layout:
 *   js/config.js      — rarities, eggs, shops, fusion recipes, constants
 *   js/runtime.js     — shared mutable game state
 *   js/state.js       — save state creation, sanitization, merge
 *   js/utils.js       — formatting helpers
 *   js/api.js         — backend API calls
 *   js/save.js        — local/remote save and load
 *   js/auth.js        — login, register, logout
 *   js/loops.js       — game tick and auto-save loops
 *   js/rolling.js     — roll mechanics and multipliers
 *   js/economy.js     — shop, prestige, daily rewards, achievements
 *   js/progression.js — sets, companions, fusion, ascension
 *   js/events.js      — global events
 *   js/social.js      — leaderboard and profiles
 *   js/render.js      — all UI rendering
 *   js/main.js        — init and event bindings
 */
