# Web Game Ports Hub

Launcher for the ~920 browser game ports listed in
[Ultimate Catalog of Web Game Ports](https://github.com/Carter54git/Ultimate-Catalog-Of-Web-Game-Ports).
One web app (`web/`), wrapped for each platform. **No games are bundled** — the app indexes the catalog and
opens the third-party hosts (the "cloud" part), so nothing is downloaded or redistributed. Many ports ask for your own
original game files; entries without a playable link open their source repo.

| Platform | Wrapper | Build |
|---|---|---|
| Web / PWA | `web/` | `npm run serve` → http://localhost:8080 (any static host works) |
| Windows (.exe installer + portable) | Electron, `electron/` | `cd electron && npm i && npm run dist:win` |
| Linux AppImage | Electron | `cd electron && npm i && npm run dist:linux` (on Linux) |
| Android APK (also Android TV) | Capacitor, `android/` | needs JDK 17 + Android SDK: `npm run android:apk` |
| Samsung Tizen TV (later) | `tizen/config.xml` | see below |

CI (`.github/workflows/build.yml`) builds all of the above on GitHub Actions (Windows, Linux, APK) — run it via *Actions → Build apps*.

## Update the catalog
```
npm run catalog:update   # re-downloads upstream README and regenerates web/data/games.json
```

## Controls
Mouse/touch, or keyboard / TV remote: arrow keys move focus, Enter opens, `F` favorites, Esc / Back closes the game.

## Platform notes
- **Embedding:** many hosts send `X-Frame-Options`. Electron strips those headers for the in-app frame. On Android games open
  in a Custom Tab. In plain browsers, the "New tab" button is the fallback.
- **Tizen TV:** copy `web/*` next to `tizen/config.xml` (plus a 512×512 `icon.png`), open the folder in Tizen Studio,
  create a Samsung certificate profile, and build/run on the TV in developer mode. Tizen's webview supports iframes,
  but hosts that forbid framing can't be opened (no external browser) — filter these out before a store submission.
  Samsung store review may reject a launcher for third-party ports of commercial games; sideload for personal use.
- **Legal:** many catalogued ports are fan ports of commercial games. This app only links to them, like the upstream catalog.
