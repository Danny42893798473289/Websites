import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { validatePin } from '@little-remote/shared';

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

interface HostConfig {
  pin?: string;
}

export function getSavedPin(): string | undefined {
  const envPin = process.env.HOST_PIN?.trim();
  if (envPin) {
    if (!validatePin(envPin)) return envPin;
  }

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) as HostConfig;
      const pin = data.pin?.trim();
      if (pin && !validatePin(pin)) return pin;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export function savePin(pin: string): { ok: true } | { ok: false; error: string } {
  const err = validatePin(pin);
  if (err) return { ok: false, error: err };
  const trimmed = pin.trim();
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ pin: trimmed }, null, 2), 'utf8');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not save config' };
  }
}
