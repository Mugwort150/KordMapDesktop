import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

async function main() {
  const prodUrl = process.env.PRISMA_DATABASE_URL;
  const devUrl = process.env.DEV_DATABASE_URL;

  if (!prodUrl || !devUrl) {
    console.error("❌ Missing PRISMA_DATABASE_URL or DEV_DATABASE_URL in .env");
    process.exit(1);
  }

  // 1. Initialize Production Connection
  const prodPool = new Pool({ connectionString: prodUrl });
  const prodAdapter = new PrismaPg(prodPool);
  const prodPrisma = new PrismaClient({ adapter: prodAdapter });

  // 2. Initialize Development Connection
  const devPool = new Pool({ connectionString: devUrl });
  const devAdapter = new PrismaPg(devPool);
  const devPrisma = new PrismaClient({ adapter: devAdapter });

  try {
    console.log("📥 Fetching markers from Production...");
    const prodMarkers = await prodPrisma.marker.findMany();
    
    if (prodMarkers.length === 0) {
      console.log("⚠️ Production database is empty. Nothing to copy.");
      return;
    }

    console.log(`📦 Found ${prodMarkers.length} markers. Clearing current Dev database...`);
    await devPrisma.marker.deleteMany(); // Wipes the dev DB so we don't get duplicates

    console.log("📤 Inserting markers into Dev...");
    await devPrisma.marker.createMany({
      data: prodMarkers,
    });

    console.log("✅ Database successfully copied!");

  } catch (error) {
    console.error("❌ Error copying database:", error);
  } finally {
    await prodPrisma.$disconnect();
    await devPrisma.$disconnect();
  }
}

main();