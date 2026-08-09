'use server';

import prisma from '@/lib/prisma';
import { EventEmitter } from 'events';
import { put } from '@vercel/blob';

// Increases the Node.js listener limit to handle large payloads during map initialization
EventEmitter.defaultMaxListeners = 50;

const EDITOR_PASSWORD = process.env.EDITOR_PASSWORD;

/**
 * Uploads a Base64 image string to Vercel Blob Storage.
 * Returns the public URL of the uploaded image.
 */
export async function uploadImage(base64Image: string): Promise<string | null> {
  try {
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const buffer = Buffer.from(matches[2], 'base64');
    const extension = matches[1].split('/')[1] || 'webp';
    const filename = `marker-${Date.now()}.${extension}`;

    const blob = await put(filename, buffer, { access: 'public' });
    return blob.url;
  } catch (error) {
    console.error("Vercel Blob upload failed:", error);
    return null;
  }
}

/**
 * Fetches all approved markers for a specific map, plus any local pending markers submitted by the user.
 */
export async function getMarkers(mapName: string, localPendingIds: string[] = []) {
  return prisma.marker.findMany({ 
    where: { 
      mapName,
      OR: [
        { approved: true },
        { id: { in: localPendingIds } }
      ]
    }, 
    orderBy: { createdAt: 'desc' } 
  });
}

/**
 * Fetches the queue of unapproved markers for admins.
 */
export async function getPendingMarkers(password: string, mapName: string) {
  if (password !== EDITOR_PASSWORD) return { error: 'Unauthorized' };
  const markers = await prisma.marker.findMany({ 
    where: { approved: false, mapName }, 
    orderBy: { createdAt: 'asc' } 
  });
  return { markers };
}

/**
 * Creates a new marker. Auto-approves if the editor password is provided.
 */
export async function createMarker(data: any, password?: string) {
  try {
    const isEditor = password === EDITOR_PASSWORD;
    const newMarker = await prisma.marker.create({
      data: {
        title: data.title, description: data.description, lat: data.lat, lng: data.lng,
        floorId: data.floorId, type: data.type, imageUrl: data.imageUrl, submitter: data.submitter,
        mapName: data.mapName,
        approved: isEditor, 
      }
    });
    return { success: true, marker: newMarker, autoApproved: isEditor };
  } catch (error) {
    return { success: false, error: "Failed to save marker" };
  }
}

/**
 * Updates an existing marker. If modified by a guest, it creates a new pending proposal instead of overwriting.
 */
export async function updateMarker(id: string, data: any, password?: string) {
  try {
    const isEditor = password === EDITOR_PASSWORD;
    if (isEditor) {
      const updatedMarker = await prisma.marker.update({
        where: { id },
        data: {
          title: data.title, description: data.description, type: data.type, submitter: data.submitter,
          lat: data.lat, lng: data.lng, floorId: data.floorId, imageUrl: data.imageUrl, mapName: data.mapName,
        }
      });
      return { success: true, marker: updatedMarker, autoApproved: true };
    } else {
      const pendingEdit = await prisma.marker.create({
        data: {
          title: data.title, description: data.description, type: data.type, submitter: data.submitter,
          lat: data.lat, lng: data.lng, floorId: data.floorId, imageUrl: data.imageUrl, mapName: data.mapName,
          approved: false, originalId: id 
        }
      });
      return { success: true, marker: pendingEdit, autoApproved: false };
    }
  } catch (error) {
    return { success: false, error: "Failed to update marker" };
  }
}

/**
 * Approves a pending marker. If it was an edit proposal, deletes the original marker it replaces.
 */
export async function approveMarker(id: string, password: string) {
  if (password !== EDITOR_PASSWORD) return { success: false };
  const marker = await prisma.marker.findUnique({ where: { id } });
  
  if (marker?.originalId) {
    await prisma.marker.delete({ where: { id: marker.originalId } }).catch(() => {});
  }
  
  await prisma.marker.update({ where: { id }, data: { approved: true, originalId: null } });
  return { success: true };
}

/**
 * Deletes a marker permanently.
 */
export async function deleteMarker(id: string, password: string) {
  if (password !== EDITOR_PASSWORD) return { success: false };
  await prisma.marker.delete({ where: { id } });
  return { success: true };
}

/**
 * Bulk imports legacy markers. Retains Base64 encoding to prevent Vercel Serverless Function timeouts during mass operations.
 */
export async function importLegacyMarkers(markers: any[], password: string) {
  if (password !== EDITOR_PASSWORD) return { success: false, error: 'Unauthorized' };
  try {
    await prisma.marker.createMany({
      data: markers.map(m => ({
        title: m.title, description: m.description, lat: m.lat, lng: m.lng,
        floorId: m.floorId, type: m.type, imageUrl: m.imageUrl, submitter: m.submitter,
        mapName: m.mapName,
        approved: true 
      }))
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Import failed" };
  }
}