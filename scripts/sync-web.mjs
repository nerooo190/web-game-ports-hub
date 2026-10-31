// Copies ./web into the given destination (relative to repo root).
import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.resolve(root, process.argv[2] ?? 'electron/web');
await rm(dest, { recursive: true, force: true });
await cp(path.join(root, 'web'), dest, { recursive: true });
console.log('synced web ->', path.relative(root, dest));
