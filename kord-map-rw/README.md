# KordMap Desktop

Offline desktop build of [KordMap](https://github.com/KalleLeskinen/KordMap), packaged with
[Tauri](https://tauri.app). This fork removes every runtime network dependency: map SVGs, cover
images and Leaflet assets are bundled, and markers live in a local file instead of Postgres.

## Differences from upstream

| | upstream | this fork |
| --- | --- | --- |
| Map SVGs | fetched from `raw.githubusercontent.com` at runtime | bundled in `public/maps/` |
| Cover images | fetched from the Tarkov wiki CDN | bundled in `public/covers/` |
| Leaflet marker images | fetched from unpkg | bundled in `public/leaflet/` |
| Markers | Postgres + Vercel Blob + approval queue | `markers.json` in the app data dir (desktop) or `localStorage` (browser) |
| Editing | password-protected, moderated | always unlocked; the local user owns the data |
| Hosting | Next.js server on Vercel | `output: 'export'` static build inside a Tauri window |

Because there is a single local owner, the approval queue is always empty and every edit is applied
immediately. The action signatures in `app/actions/markers.ts` still accept the upstream
`password` arguments so the UI components are untouched.

## Requirements

- Node.js 22+
- Rust stable 1.86+ (`edition2024` support is required by Tauri's dependency tree)
- Linux only: `libwebkit2gtk-4.1-dev build-essential libxdo-dev libssl-dev librsvg2-dev pkg-config`

## Development

```bash
npm install
npm run desktop:dev    # Tauri window against the Next.js dev server
npm run dev            # browser-only, markers persist in localStorage
```

## Building the app

```bash
npm run desktop:build  # static export + native bundle in src-tauri/target/release/bundle
```

Windows/macOS bundles are produced by the `desktop-build` GitHub Actions workflow, since Tauri
cannot cross-compile from Linux.

## Where the data lives

| Platform | Path |
| --- | --- |
| Linux | `~/.local/share/jp.mugwort.kordmapdesktop/markers.json` |
| Windows | `%APPDATA%\jp.mugwort.kordmapdesktop\markers.json` |
| macOS | `~/Library/Application Support/jp.mugwort.kordmapdesktop/markers.json` |

Marker screenshots are written next to it under `images/`. On first launch the file is seeded from
`public/markers.json`. Settings import/export in the app UI works with the same JSON shape, so
markers can be moved between machines.

## Refreshing the bundled map assets

`scripts/asset-sources.json` records the original upstream URL of every map and cover image.
Re-download them (and rewrite `public/maps.json` plus any remote `<image href>` inside an SVG) with:

```bash
npm run fetch:assets
```

This is the only step that needs an internet connection.

## Credits & Licensing

See [../readme.md](../readme.md) for the full attribution list. KordMap and the bundled map assets
are licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/); this modified
desktop version is distributed under the same license, non-commercially, with the original credits
kept in the app UI.

This project is entirely unofficial and is not endorsed by or affiliated with Battlestate Games.
