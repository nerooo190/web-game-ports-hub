// Parses the upstream catalog README into web/data/games.json.
// Usage: node scripts/build-catalog.mjs [--fetch]
//   --fetch  re-download the README from GitHub first (otherwise uses scripts/catalog-source.md)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcFile = path.join(root, 'scripts', 'catalog-source.md');
const outFile = path.join(root, 'web', 'data', 'games.json');
const RAW = 'https://raw.githubusercontent.com/Carter54git/Ultimate-Catalog-Of-Web-Game-Ports/main/README.md';

if (process.argv.includes('--fetch')) {
  const res = await fetch(RAW);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  await writeFile(srcFile, await res.text());
}

const md = await readFile(srcFile, 'utf8');
const linkRe = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/;

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

const games = [];
let section = null;
for (const line of md.split(/\r?\n/)) {
  const h = line.match(/^## (\S+)\s*<sub>/);
  if (h) { section = h[1]; continue; }
  if (!section || !line.startsWith('|')) continue;
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length < 3 || cells[0] === 'Game' || /^-+$/.test(cells[0].replace(/[: ]/g, ''))) continue;

  const name = cells[0].replace(/^⭐\s*/, '').trim();
  if (!name) continue;
  const play = cells[1].match(linkRe)?.[2] ?? null;
  const source = cells[2].match(linkRe)?.[2] ?? null;
  if (!play && !source) continue;

  games.push({
    id: games.length + 1,
    name,
    letter: section === '#' ? '#' : section.toUpperCase(),
    play,
    playHost: play ? hostOf(play) : null,
    source,
    sourceHost: source ? hostOf(source) : null,
  });
}

const stats = {
  total: games.length,
  playable: games.filter((g) => g.play).length,
  withSource: games.filter((g) => g.source).length,
  both: games.filter((g) => g.play && g.source).length,
};
await writeFile(outFile, JSON.stringify({ generated: new Date().toISOString(), stats, games }));
console.log(stats, '->', path.relative(root, outFile));
