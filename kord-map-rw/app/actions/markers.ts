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

// -------------------------------------------------------------------------
// 🛡️ SECURITY: RATE LIMITING SETUP
// -------------------------------------------------------------------------
const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(25, '1 h'),
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

// -------------------------------------------------------------------------
// 🛡️ SECURITY: SCHEMA VALIDATION (ZOD)
// -------------------------------------------------------------------------
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
    if (!allowedTypes.includes(mimeType)) {
      console.error("Security: Blocked invalid file type upload");
      return null;
    }

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
    
    const newMarker = await prisma.marker.create({
      data: { ...data, approved: isEditor }
    });
    return { success: true, marker: newMarker, autoApproved: isEditor };
  } catch (error) {
    console.error("Validation/DB Error:", error);
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
      const updatedMarker = await prisma.marker.update({
        where: { id }, data
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

export async function suggestDeleteMarker(id: string) {
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
        approved: false, originalId: id, isDeletion: true 
      }
    });
    return { success: true, marker: pendingDelete };
  } catch (error) { return { success: false, error: "Failed to suggest deletion" }; }
}

export async function verifyEditorPassword(password: string) {
  await tarpit(1000); 
  return Boolean(EDITOR_PASSWORD && password === EDITOR_PASSWORD);
}

// -------------------------------------------------------------------------
// UNAUTHENTICATED READS
// -------------------------------------------------------------------------

export async function getAllApprovedMarkerStats() {
  return prisma.marker.findMany({ where: { approved: true }, select: { mapName: true, type: true } });
}

export async function getMarkers(mapName: string, localPendingIds: string[] = []) {
  return prisma.marker.findMany({ 
    where: { mapName, OR: [ { approved: true }, { id: { in: localPendingIds } } ] }, 
    orderBy: { createdAt: 'desc' } 
  });
}

// -------------------------------------------------------------------------
// AUTHENTICATED ADMIN ACTIONS
// -------------------------------------------------------------------------

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
  const marker = await prisma.marker.findUnique({ where: { id } });
  if (marker?.originalId) await prisma.marker.delete({ where: { id: marker.originalId } }).catch(() => {});
  await prisma.marker.update({ where: { id }, data: { approved: true, originalId: null } });
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