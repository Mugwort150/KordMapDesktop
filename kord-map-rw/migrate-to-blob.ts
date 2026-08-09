import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { put } from '@vercel/blob';
import 'dotenv/config'; 

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL is missing from your .env file!");
  process.exit(1);
}

// Initialize Prisma with the Postgres Adapter
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔍 Scanning database for Base64 images...");

  const markersToMigrate = await prisma.marker.findMany({
    where: {
      imageUrl: {
        startsWith: 'data:image',
      },
    },
  });

  if (markersToMigrate.length === 0) {
    console.log("✅ No Base64 images found. Everything is already migrated!");
    return;
  }

  console.log(`📦 Found ${markersToMigrate.length} markers to migrate. Starting upload...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < markersToMigrate.length; i++) {
    const marker = markersToMigrate[i];
    
    try {
      console.log(`[${i + 1}/${markersToMigrate.length}] Migrating "${marker.title}"...`);

      const matches = marker.imageUrl!.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        console.warn(`   ⚠️ Skipping: Invalid Base64 format for marker ID ${marker.id}`);
        failCount++;
        continue;
      }

      const mimeType = matches[1]; 
      const extension = mimeType.split('/')[1] || 'webp';
      const base64Data = matches[2];
      
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `migrated-${marker.id}-${Date.now()}.${extension}`;

      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: mimeType,
      });

      await prisma.marker.update({
        where: { id: marker.id },
        data: { imageUrl: blob.url },
      });

      console.log(`   ✅ Success! New URL: ${blob.url}`);
      successCount++;
      
    } catch (error) {
      console.error(`   ❌ Failed to migrate "${marker.title}":`, error);
      failCount++;
    }
  }

  console.log("\n🎉 Migration Complete!");
  console.log(`🟢 Successfully migrated: ${successCount}`);
  if (failCount > 0) {
    console.log(`🔴 Failed to migrate: ${failCount}`);
  }
}

main()
  .catch((e) => {
    console.error("Fatal Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });