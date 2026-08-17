/**
 * Downloads every remote map/cover asset listed in scripts/asset-sources.json into
 * public/, rewrites remote <image href> references inside the SVGs to the local
 * copies and regenerates public/maps.json with local paths.
 *
 * Run with: npm run fetch:assets
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SOURCES = path.join(ROOT, 'scripts', 'asset-sources.json');

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'KordMapDesktop/asset-fetcher' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function save(relPath, buffer) {
  const dest = path.join(PUBLIC_DIR, relPath);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buffer);
  console.log(`  saved public/${relPath} (${buffer.length} bytes)`);
}

/** Inlines remote raster layers referenced by an SVG map so it works offline. */
async function localizeSvg(id, svgText) {
  const remoteRefs = [...svgText.matchAll(/(?:xlink:)?href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  let out = svgText;

  for (const [index, url] of [...new Set(remoteRefs)].entries()) {
    const ext = path.extname(new URL(url).pathname) || '.png';
    const relPath = `maps/layers/${id}-${index}${ext}`;
    await save(relPath, await download(url));
    out = out.replaceAll(url, `/${relPath}`);
  }

  return out;
}

const sources = JSON.parse(await readFile(SOURCES, 'utf8'));
const maps = {};

for (const [id, source] of Object.entries(sources)) {
  console.log(`${id}:`);
  const svg = await localizeSvg(id, (await download(source.map_url.trim())).toString('utf8'));
  await save(`maps/${id}.svg`, Buffer.from(svg, 'utf8'));

  const coverExt = path.extname(new URL(source.cover_url.trim()).pathname) || '.png';
  await save(`covers/${id}${coverExt}`, await download(source.cover_url.trim()));

  maps[id] = {
    map_name: source.map_name,
    map_url: `/maps/${id}.svg`,
    cover_url: `/covers/${id}${coverExt}`,
  };
}

await writeFile(path.join(PUBLIC_DIR, 'maps.json'), `${JSON.stringify(maps, null, 4)}\n`);
console.log(`\nWrote public/maps.json with ${Object.keys(maps).length} local maps.`);
