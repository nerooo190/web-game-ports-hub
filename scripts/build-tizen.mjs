// Assembles tizen/build/ (web app + config.xml + icon) and, if the Tizen CLI is available, packages a signed .wgt.
// Usage: node scripts/build-tizen.mjs [--profile <signing-profile-name>]
import { cp, rm, mkdir, rename } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'tizen', 'build');
const pIdx = process.argv.indexOf('--profile');
const profile = pIdx > -1 ? process.argv[pIdx + 1] : null;

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(root, 'web'), out, { recursive: true });
// No service worker on a widget (file://), and drop the PWA-only files.
await rm(path.join(out, 'sw.js'), { force: true });
await rm(path.join(out, 'manifest.webmanifest'), { force: true });
await cp(path.join(root, 'tizen', 'config.xml'), path.join(out, 'config.xml'));
await cp(path.join(root, 'tizen', 'icon.png'), path.join(out, 'icon.png'));
console.log('assembled', path.relative(root, out));

const probe = spawnSync('tizen', ['version'], { shell: true, encoding: 'utf8' });
if (probe.status !== 0) {
  console.log('Tizen CLI not found. Open tizen/build in Tizen Studio (File > Import > Tizen > Tizen Project) or add <Tizen Studio>/tools/ide/bin to PATH and re-run.');
  process.exit(0);
}
const q = (p) => `"${p}"`; // shell:true joins args with spaces; the repo path may contain some
const args = ['package', '-t', 'wgt', ...(profile ? ['-s', profile] : []), '-o', q(path.join(root, 'tizen', 'dist')), '--', q(out)];
console.log('tizen', args.join(' '));
const status = spawnSync('tizen', args, { stdio: 'inherit', shell: true }).status ?? 1;
if (status === 0) {
  // `tizen install` fails silently on the TV when the .wgt file name contains spaces, so give it a plain name.
  const dist = path.join(root, 'tizen', 'dist');
  await rename(path.join(dist, 'Web Game Ports Hub.wgt'), path.join(dist, 'WebGamePortsHub.wgt'));
  console.log('package:', path.join('tizen', 'dist', 'WebGamePortsHub.wgt'));
}
process.exit(status);
