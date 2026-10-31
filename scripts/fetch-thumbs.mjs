// Best-effort: reads og:image / twitter:image from each playable page and caches it in scripts/thumbs-cache.json
// (keyed by play URL). Hosts that yield nothing after a few tries are skipped. Re-run, then `npm run catalog`.
// Usage: node scripts/fetch-thumbs.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheFile = path.join(root, 'scripts', 'thumbs-cache.json');
const { games } = JSON.parse(await readFile(path.join(root, 'web', 'data', 'games.json'), 'utf8'));
let cache = {};
try { cache = JSON.parse(await readFile(cacheFile, 'utf8')); } catch {}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const metaRe = /<meta\b[^>]*>/gi;

async function ogImage(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const html = (await res.text()).slice(0, 300_000);
  for (const m of html.match(metaRe) ?? []) {
    if (!/(property|name)=["'](og:image|twitter:image)(:src)?["']/i.test(m)) continue;
    const c = m.match(/content=["']([^"']+)["']/i)?.[1];
    if (!c) continue;
    try { const u = new URL(c.replace(/&amp;/g, '&'), res.url); if (u.protocol === 'https:' || u.protocol === 'http:') return u.href; } catch {}
  }
  return null;
}

const byHost = new Map();
for (const g of games) {
  if (!g.play || g.play in cache) continue;
  (byHost.get(g.playHost) ?? byHost.set(g.playHost, []).get(g.playHost)).push(g.play);
}

let done = 0, hits = 0;
await Promise.all([...byHost].map(async ([host, urls]) => {
  let tries = 0, ok = 0;
  for (const url of urls) {
    if (tries >= 6 && ok === 0) { for (const u of urls) if (!(u in cache)) cache[u] = null; break; } // host gives nothing: stop hammering it
    tries++;
    try { cache[url] = await ogImage(url); } catch { cache[url] = null; }
    if (cache[url]) { ok++; hits++; }
    done++;
    await new Promise((r) => setTimeout(r, 120));
  }
}));

await writeFile(cacheFile, JSON.stringify(cache, null, 1));
console.log(`pages tried: ${done}, thumbnails found: ${hits}, cached entries: ${Object.keys(cache).length}`);
