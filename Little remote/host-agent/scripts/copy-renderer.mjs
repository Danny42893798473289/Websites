import { cpSync, mkdirSync, renameSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'dist'), { recursive: true });
cpSync(join(root, 'renderer'), join(root, 'dist/renderer'), { recursive: true });

const preloadJs = join(root, 'dist/preload.js');
const preloadCjs = join(root, 'dist/preload.cjs');
if (existsSync(preloadJs)) {
  renameSync(preloadJs, preloadCjs);
}
