import { getRarityIndex } from "./config.js";
import { runtime } from "./runtime.js";

export function playClickTone() {
  if (!runtime.state || !runtime.state.settings.soundEnabled) return;
  playTone(430, 0.04);
}

export function playToneByRarity(rarityName) {
  if (!runtime.state || !runtime.state.settings.soundEnabled) return;
  const idx = Math.max(0, getRarityIndex(rarityName));
  const freq = 360 + idx * 55;
  const duration = 0.07 + idx * 0.01;
  playTone(freq, duration);
}

export function playTone(frequency, durationSeconds) {
  try {
    if (!runtime.audioCtx) {
      runtime.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = runtime.audioCtx.createOscillator();
    const gain = runtime.audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(runtime.audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, runtime.audioCtx.currentTime + durationSeconds);
    osc.stop(runtime.audioCtx.currentTime + durationSeconds);
  } catch (err) {
    // Ignore audio errors.
  }
}
