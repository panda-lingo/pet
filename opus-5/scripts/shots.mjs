/**
 * Visual check helper (not part of the test suite).
 *
 * Opens a built single-file solution from disk and writes PNGs into `screenshots/`.
 * Usage: `node scripts/shots.mjs svg-pet` after `npm run build:html`.
 */
import { mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const app = process.argv[2] ?? 'svg-pet';
const only = process.argv[3] ?? null;
const root = fileURLToPath(new URL('..', import.meta.url));
const collected = `${root}dist-html/${app}.html`;
const exists = await stat(collected).then(
  () => true,
  () => false,
);
// Before `build:html` has run for both apps, fall back to the app's own build output.
const page = `file://${exists ? collected : `${root}apps/${app}/dist/index.html`}`;
const out = `${root}screenshots`;
await mkdir(out, { recursive: true });

const shots = [
  { id: 'desktop', width: 1440, height: 900, hash: '' },
  { id: 'mobile', width: 390, height: 844, hash: '' },
  { id: 'gallery', width: 1280, height: 1800, hash: '#gallery' },
  { id: 'speak', width: 1440, height: 900, hash: '#speak' },
];

const browser = await chromium.launch();
for (const shot of shots) {
  if (only && only !== shot.id) continue;
  const context = await browser.newContext({ viewport: { width: shot.width, height: shot.height } });
  const view = await context.newPage();
  const errors = [];
  view.on('pageerror', (error) => errors.push(String(error)));
  view.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await view.goto(`${page}${shot.hash}`);
  await view.waitForTimeout(2_500);
  await view.screenshot({ path: `${out}/${app}-${shot.id}.png`, fullPage: shot.id === 'gallery' });
  console.log(`${app}-${shot.id}.png`, errors.length ? `errors: ${errors.join(' | ')}` : 'clean');
  await context.close();
}
await browser.close();
