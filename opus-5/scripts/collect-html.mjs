#!/usr/bin/env node
/**
 * Copies each app's single-file production build into `dist-html/` so the two solutions
 * can be opened straight from disk, and writes a small chooser page next to them.
 */
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist-html');

const solutions = [
  { file: 'svg-pet.html', from: 'apps/svg-pet/dist/index.html', title: 'Solution A — inline SVG pet' },
  { file: 'pixi-pet.html', from: 'apps/pixi-pet/dist/index.html', title: 'Solution B — PixiJS v8 pet' },
];

await mkdir(outDir, { recursive: true });

const rows = [];
for (const solution of solutions) {
  const source = join(root, solution.from);
  const target = join(outDir, solution.file);
  await copyFile(source, target);
  const info = await stat(target);
  const html = await readFile(target, 'utf8');
  const inlineScripts = (html.match(/<script/g) ?? []).length;
  const externalAssets = (html.match(/src="\/|href="\/assets/g) ?? []).length;
  rows.push({ ...solution, kb: Math.round(info.size / 1024), inlineScripts, externalAssets });
  console.log(
    `${solution.file}: ${Math.round(info.size / 1024)} kB, ${inlineScripts} script tag(s), ${externalAssets} external asset reference(s)`,
  );
}

const chooser = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PandaLingo website pet — two solutions</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0; min-height: 100vh; display: grid; place-items: center;
        background: #F8F6F2; color: #1E1E1E;
        font: 400 18px/1.8 Inter, -apple-system, 'Segoe UI', Roboto, sans-serif;
      }
      main { width: min(720px, 90vw); padding: 48px 0; }
      h1 { font: 400 clamp(36px, 6vw, 56px)/1.15 'Cormorant Garamond', 'Playfair Display', Georgia, serif; margin: 0 0 12px; }
      p { color: #6B6B6B; margin: 0 0 40px; }
      a { display: block; padding: 28px 32px; margin-bottom: 20px; text-decoration: none; color: inherit;
          background: #fff; border: 1px solid rgba(0,0,0,.06); border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,.05); transition: transform 250ms cubic-bezier(.22,.61,.36,1); }
      a:hover, a:focus-visible { transform: translateY(-2px); }
      strong { font-weight: 500; display: block; }
      span { color: #B68C5A; font-size: 15px; letter-spacing: .08em; text-transform: uppercase; }
    </style>
  </head>
  <body>
    <main>
      <span>PandaLingo</span>
      <h1>Two website pets</h1>
      <p>One shared domain core, two renderers. Open either file directly — no server needed.</p>
${rows.map((row) => `      <a href="./${row.file}"><strong>${row.title}</strong>${row.kb} kB, self-contained</a>`).join('\n')}
    </main>
  </body>
</html>
`;

await writeFile(join(outDir, 'index.html'), chooser, 'utf8');
console.log(`chooser: dist-html/index.html`);
