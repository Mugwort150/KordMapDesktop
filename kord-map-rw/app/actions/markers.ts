'use server';

import prisma from '@/lib/prisma';
import { EventEmitter } from 'events';
import { put } from '@vercel/blob';
import { z } from 'zod';
import { headers } from 'next/headers';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

EventEmitter.defaultMaxListeners = 50;

const EDITOR_PASSWORD = process.env.EDITOR_PASSWORD;

const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '1 h'),
    })
  : null;

async function checkRateLimit(password?: string): Promise<boolean> {
  if (EDITOR_PASSWORD && password === EDITOR_PASSWORD) return true; 
  if (!ratelimit) return true; 

  const reqHeaders = await headers();
  const ip = reqHeaders.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(`guest_${ip}`);
  
  if (!success) console.warn(`🔴 Rate limit hit for IP: ${ip}`);
  return success;
}

const MarkerSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  lat: z.number(),
  lng: z.number(),
  floorId: z.string().max(50),
  type: z.string().max(50),
  imageUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  submitter: z.string().max(50).optional().nullable(),
  mapName: z.string().max(50),
});

const tarpit = async (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// -------------------------------------------------------------------------
// 🚀 NEW: IMAGE HOSTING HELPER
// -------------------------------------------------------------------------
/**
 * Downloads an external image URL and re-hosts it on Vercel Blob.
 */
async function ensureHostedImage(url: string | null | undefined): Promise<string | null | undefined> {
  if (!url) return url;
  
  // Check if it's an external HTTP link and NOT already on Vercel Blob
  if (url.startsWith('http') && !url.includes('vercel-storage.com')) {
    try {
      const res = await fetch(url);
      if (!res.ok) return url; // Fallback to original if download fails
      
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = res.headers.get('content-type') || 'image/webp';
      const extension = contentType.split('/')[1] || 'webp';
      const filename = `marker-${Date.now()}-${Math.round(Math.random()*1000)}.${extension}`;
      
      const blob = await put(filename, buffer, { access: 'public', contentType });
      return blob.url; // Return the new safe Vercel Blob URL
    } catch(e) {
      console.error("Failed to host external image", e);
      return url;
    }
  }
  return url;
}

// -------------------------------------------------------------------------
// DATABASE ACTIONS
// -------------------------------------------------------------------------

export async function uploadImage(base64Image: string): Promise<string | null> {
  await tarpit();
  
  if (!ratelimit) return null;
  const reqHeaders = await headers();
  const ip = reqHeaders.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(`upload_${ip}`);
  if (!success) return null;

  try {
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const mimeType = matches[1];
    const allowedTypes = ['image/webp', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(mimeType)) return null;

    const buffer = Buffer.from(matches[2], 'base64');
    const extension = mimeType.split('/')[1];
    const filename = `marker-${Date.now()}-${Math.round(Math.random()*1000)}.${extension}`;

    const blob = await put(filename, buffer, { access: 'public' });
    return blob.url;
  } catch (error) {
    return null;
  }
}

export async function createMarker(rawData: any, password?: string) {
  await tarpit();
  if (!(await checkRateLimit(password))) return { success: false, error: "Rate limit exceeded. Try again later." };

  try {
    const data = MarkerSchema.parse(rawData);
    const isEditor = Boolean(EDITOR_PASSWORD && password === EDITOR_PASSWORD);
    
    // Auto-download external links if an admin skips the queue
    if (isEditor && data.imageUrl) {
      data.imageUrl = await ensureHostedImage(data.imageUrl);
    }

    const newMarker = await prisma.marker.create({
      data: { ...data, approved: isEditor }
    });
    return { success: true, marker: newMarker, autoApproved: isEditor };
  } catch (error) {
    return { success: false, error: "Invalid data or failed to save" };
  }
}

export async function updateMarker(id: string, rawData: any, password?: string) {
  await tarpit();
  if (!(await checkRateLimit(password))) return { success: false, error: "Rate limit exceeded. Try again later." };

  try {
    const data = MarkerSchema.parse(rawData);
    const isEditor = Boolean(EDITOR_PASSWORD && password === EDITOR_PASSWORD);
    
    if (isEditor) {
      if (data.imageUrl) data.imageUrl = await ensureHostedImage(data.imageUrl);
      
      const updatedMarker = await prisma.marker.update({
        where: { id }, 
        data: {
          ...data,
          lastEditor: data.submitter || "Admin" // 🚀 Track Admin Edit
        }
      });
      return { success: true, marker: updatedMarker, autoApproved: true };
    } else {
      const pendingEdit = await prisma.marker.create({
        data: { ...data, approved: false, originalId: id }
      });
      return { success: true, marker: pendingEdit, autoApproved: false };
    }
  } catch (error) {
    return { success: false, error: "Invalid data or failed to update" };
  }
}

export async function suggestDeleteMarker(id: string, reason: string) {
  await tarpit();
  if (!(await checkRateLimit())) return { success: false, error: "Rate limit exceeded. Try again later." };

  try {
    const original = await prisma.marker.findUnique({ where: { id } });
    if (!original) return { success: false, error: "Marker not found" };

    const pendingDelete = await prisma.marker.create({
      data: {
        title: original.title, description: original.description, lat: original.lat, lng: original.lng,
        floorId: original.floorId, type: original.type, imageUrl: original.imageUrl, 
        submitter: "Guest (Deletion Request)", mapName: original.mapName,
        approved: false, originalId: id, isDeletion: true,
        deletionReason: reason // 🚀 Saved to DB
      }
    });
    return { success: true, marker: pendingDelete };
  } catch (error) { return { success: false, error: "Failed to suggest deletion" }; }
}

export async function verifyEditorPassword(password: string) {
  await tarpit(1000); 
  return Boolean(EDITOR_PASSWORD && password === EDITOR_PASSWORD);
}

export async function getAllApprovedMarkerStats() {
  return prisma.marker.findMany({ where: { approved: true }, select: { mapName: true, type: true } });
}

export async function getMarkers(mapName: string, localPendingIds: string[] = []) {
  return prisma.marker.findMany({ 
    where: { mapName, OR: [ { approved: true }, { id: { in: localPendingIds } } ] }, 
    orderBy: { createdAt: 'desc' } 
  });
}

export async function getAllPendingMarkerStats(password: string) {
  if (!EDITOR_PASSWORD || password !== EDITOR_PASSWORD) return [];
  return prisma.marker.findMany({ where: { approved: false }, select: { mapName: true, id: true } });
}

export async function getPendingMarkers(password: string, mapName: string) {
  if (!EDITOR_PASSWORD || password !== EDITOR_PASSWORD) return { error: 'Unauthorized' };
  const markers = await prisma.marker.findMany({ where: { approved: false, mapName }, orderBy: { createdAt: 'asc' } });
  return { markers };
}

export async function approveMarker(id: string, password: string) {
  if (!EDITOR_PASSWORD || password !== EDITOR_PASSWORD) return { success: false };
  const pending = await prisma.marker.findUnique({ where: { id } });
  
  if (pending?.isDeletion) {
    if (pending.originalId) await prisma.marker.delete({ where: { id: pending.originalId } }).catch(() => {});
    await prisma.marker.delete({ where: { id } });
    return { success: true };
  }

  let finalImageUrl = pending?.imageUrl;
  if (finalImageUrl) finalImageUrl = await ensureHostedImage(finalImageUrl);

  // 🚀 MERGE EDIT: Update the original marker with the new data, and log the editor
  if (pending?.originalId) {
    await prisma.marker.update({
      where: { id: pending.originalId },
      data: {
        title: pending.title,
        description: pending.description,
        lat: pending.lat,
        lng: pending.lng,
        floorId: pending.floorId,
        type: pending.type,
        imageUrl: finalImageUrl,
        lastEditor: pending.submitter || "Guest", // Save the editor's name!
      }
    });
    await prisma.marker.delete({ where: { id } }); // Delete the pending proposal
    return { success: true };
  }
  
  // Standard new marker approval
  await prisma.marker.update({ 
    where: { id }, 
    data: { approved: true, originalId: null, imageUrl: finalImageUrl } 
  });
  return { success: true };
}

export async function deleteMarker(id: string, password: string) {
  if (!EDITOR_PASSWORD || password !== EDITOR_PASSWORD) return { success: false };
  await prisma.marker.delete({ where: { id } });
  return { success: true };
}

export async function importLegacyMarkers(markers: any[], password: string) {
  if (!EDITOR_PASSWORD || password !== EDITOR_PASSWORD) return { success: false, error: 'Unauthorized' };
  try {
    await prisma.marker.createMany({
      data: markers.map(m => ({
        title: m.title, description: m.description, lat: m.lat, lng: m.lng,
        floorId: m.floorId, type: m.type, imageUrl: m.imageUrl, submitter: m.submitter,
        mapName: m.mapName, approved: true 
      }))
    });
    return { success: true };
  } catch (error) { return { success: false, error: "Import failed" }; }
}