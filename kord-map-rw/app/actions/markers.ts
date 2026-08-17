'use client';

/**
 * Offline replacement for the upstream server actions.
 *
 * The hosted version keeps markers in Postgres and moderates guest submissions
 * through an approval queue. The desktop build has a single local user who owns the
 * data, so every write is applied immediately and the approval queue stays empty.
 * The exported signatures keep the upstream shape — including the now-ignored
 * `password` arguments — so the UI components work untouched.
 */

import { readRaw, saveImage, writeRaw } from '@/lib/localStore';

export type Marker = {
  id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  floorId: string;
  type: string;
  imageUrl: string | null;
  submitter: string | null;
  lastEditor: string | null;
  approved: boolean;
  originalId: string | null;
  isDeletion: boolean;
  deletionReason: string | null;
  mapName: string;
  createdAt: string;
  updatedAt: string;
};

/** Password kept only so the editor UI has a truthy session token; nothing is checked. */
export const LOCAL_EDITOR_TOKEN = 'local';

const ALLOWED_IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png'];

function newest(markers: Marker[]): Marker[] {
  return [...markers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function loadMarkers(): Promise<Marker[]> {
  return (await readRaw()) as Marker[];
}

function normalize(rawData: Record<string, unknown>): Omit<Marker, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: String(rawData.title ?? '').slice(0, 100),
    description: rawData.description ? String(rawData.description).slice(0, 500) : null,
    lat: Number(rawData.lat),
    lng: Number(rawData.lng),
    floorId: String(rawData.floorId ?? '').slice(0, 50),
    type: String(rawData.type ?? '').slice(0, 50),
    imageUrl: rawData.imageUrl ? String(rawData.imageUrl) : null,
    submitter: rawData.submitter ? String(rawData.submitter).slice(0, 50) : null,
    lastEditor: null,
    approved: true,
    originalId: null,
    isDeletion: false,
    deletionReason: null,
    mapName: String(rawData.mapName ?? '').slice(0, 50),
  };
}

function isValid(marker: Omit<Marker, 'id' | 'createdAt' | 'updatedAt'>): boolean {
  return Boolean(marker.title) && Number.isFinite(marker.lat) && Number.isFinite(marker.lng) && Boolean(marker.mapName);
}

export async function uploadImage(base64Image: string): Promise<string | null> {
  const matches = base64Image.match(/^data:([\w+/-]+);base64,(.+)$/);
  if (!matches) return null;

  const mimeType = matches[1];
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) return null;

  try {
    return await saveImage(base64Image, mimeType.split('/')[1]);
  } catch {
    return null;
  }
}

export async function createMarker(rawData: Record<string, unknown>, _password?: string) {
  const data = normalize(rawData);
  if (!isValid(data)) return { success: false, error: 'Invalid marker data' };

  const now = new Date().toISOString();
  const marker: Marker = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };

  await writeRaw([...(await loadMarkers()), marker]);
  return { success: true, marker, autoApproved: true };
}

export async function updateMarker(id: string, rawData: Record<string, unknown>, _password?: string) {
  const data = normalize(rawData);
  if (!isValid(data)) return { success: false, error: 'Invalid marker data' };

  const markers = await loadMarkers();
  const existing = markers.find((m) => m.id === id);
  if (!existing) return { success: false, error: 'Marker not found' };

  const marker: Marker = {
    ...existing,
    ...data,
    lastEditor: data.submitter || existing.submitter,
    updatedAt: new Date().toISOString(),
  };

  await writeRaw(markers.map((m) => (m.id === id ? marker : m)));
  return { success: true, marker, autoApproved: true };
}

export async function suggestDeleteMarker(id: string, _reason?: string) {
  const markers = await loadMarkers();
  const marker = markers.find((m) => m.id === id);
  if (!marker) return { success: false, error: 'Marker not found' };

  await writeRaw(markers.filter((m) => m.id !== id));
  return { success: true, marker };
}

export async function verifyEditorPassword(_password?: string): Promise<boolean> {
  return true;
}

export async function getAllApprovedMarkerStats() {
  return (await loadMarkers()).map(({ mapName, type }) => ({ mapName, type }));
}

export async function getMarkers(mapName: string, _localPendingIds: string[] = []) {
  return newest((await loadMarkers()).filter((m) => m.mapName === mapName));
}

export async function getAllPendingMarkerStats(_password?: string): Promise<{ mapName: string; id: string }[]> {
  return [];
}

export async function getPendingMarkers(_password?: string, _mapName?: string): Promise<{ markers: Marker[] }> {
  return { markers: [] };
}

export async function approveMarker(_id?: string, _password?: string) {
  return { success: true };
}

export async function deleteMarker(id: string, _password?: string) {
  const markers = await loadMarkers();
  await writeRaw(markers.filter((m) => m.id !== id));
  return { success: true };
}

export async function importLegacyMarkers(imported: Record<string, unknown>[], _password?: string) {
  const now = new Date().toISOString();
  const markers = imported
    .map((raw) => normalize(raw))
    .filter(isValid)
    .map((data) => ({ ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }));

  if (markers.length === 0) return { success: false, error: 'No valid markers found' };

  await writeRaw([...(await loadMarkers()), ...markers]);
  return { success: true };
}

/** Serializes the local database so it can be backed up or moved to another machine. */
export async function exportMarkers(): Promise<string> {
  return JSON.stringify(await loadMarkers(), null, 2);
}
