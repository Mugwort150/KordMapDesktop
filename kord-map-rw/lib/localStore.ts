'use client';

/**
 * Offline storage backend for the desktop build.
 *
 * Inside Tauri the marker database and marker images live as plain files under the
 * OS app-data directory, so nothing leaves the machine. In a plain browser the same
 * data is kept in localStorage, which keeps `npm run dev` usable without Tauri.
 */

const MARKERS_FILE = 'markers.json';
const IMAGES_DIR = 'images';
const LOCAL_STORAGE_KEY = 'kordLocalMarkers';
const SEED_URL = '/markers.json';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function readMarkersFile(): Promise<string | null> {
  const { BaseDirectory, exists, readTextFile } = await import('@tauri-apps/plugin-fs');
  if (!(await exists(MARKERS_FILE, { baseDir: BaseDirectory.AppData }))) return null;
  return readTextFile(MARKERS_FILE, { baseDir: BaseDirectory.AppData });
}

async function writeMarkersFile(contents: string): Promise<void> {
  const { BaseDirectory, mkdir, writeTextFile } = await import('@tauri-apps/plugin-fs');
  await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true });
  await writeTextFile(MARKERS_FILE, contents, { baseDir: BaseDirectory.AppData });
}

/** Markers shipped with the app, used the first time the app runs. */
async function readSeed(): Promise<unknown[]> {
  try {
    const res = await fetch(SEED_URL, { cache: 'no-store' });
    if (!res.ok) return [];
    const seed = await res.json();
    return Array.isArray(seed) ? seed : [];
  } catch {
    return [];
  }
}

export async function readRaw(): Promise<unknown[]> {
  const stored = isTauri() ? await readMarkersFile() : localStorage.getItem(LOCAL_STORAGE_KEY);

  if (stored === null) {
    const seed = await readSeed();
    await writeRaw(seed);
    return seed;
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeRaw(markers: unknown[]): Promise<void> {
  const contents = JSON.stringify(markers, null, 2);
  if (isTauri()) await writeMarkersFile(contents);
  else localStorage.setItem(LOCAL_STORAGE_KEY, contents);
}

/**
 * Persists a data-URL image next to the marker database and returns a URL the
 * webview can render. Browser builds keep the data URL as-is.
 */
export async function saveImage(dataUrl: string, extension: string): Promise<string> {
  if (!isTauri()) return dataUrl;

  const { BaseDirectory, mkdir, writeFile } = await import('@tauri-apps/plugin-fs');
  const { appDataDir, join } = await import('@tauri-apps/api/path');
  const { convertFileSrc } = await import('@tauri-apps/api/core');

  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const filename = `marker-${Date.now()}-${Math.round(Math.random() * 1000)}.${extension}`;
  const relPath = `${IMAGES_DIR}/${filename}`;

  await mkdir(IMAGES_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  await writeFile(relPath, bytes, { baseDir: BaseDirectory.AppData });

  return convertFileSrc(await join(await appDataDir(), relPath));
}
