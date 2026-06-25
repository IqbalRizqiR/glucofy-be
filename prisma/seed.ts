/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/**
 * Prisma Seed Script — NutriGradeThreshold
 *
 * Run with: pnpm prisma db seed
 *
 * Seeds NutriGrade threshold values based on Indonesian Nutri-Level
 * regulation (April 2026). Values are MAX allowed per 100ml per grade.
 * The worst grade across all 3 parameters determines the final grade.
 */

import { PrismaClient, NutriGrade } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL, // Use direct connection for seeding
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Nutri-Grade Thresholds...\n');

  // Based on Indonesian Nutri-Level regulation (April 2026)
  // Values are MAX allowed per 100ml for each grade.
  // Note: Grade D uses 9999 as "no upper limit" (PostgreSQL doesn't support Infinity for float)
  const thresholds = [
    {
      grade: NutriGrade.A,
      maxSugarPer100ml: 1.0,
      maxSaltPer100ml: 0.1,
      maxSaturatedFatPer100ml: 0.7,
    },
    {
      grade: NutriGrade.B,
      maxSugarPer100ml: 5.0,
      maxSaltPer100ml: 0.3,
      maxSaturatedFatPer100ml: 1.2,
    },
    {
      grade: NutriGrade.C,
      maxSugarPer100ml: 8.0,
      maxSaltPer100ml: 0.6,
      maxSaturatedFatPer100ml: 2.8,
    },
    {
      // Grade D = anything above Grade C (9999 = effectively no upper limit)
      grade: NutriGrade.D,
      maxSugarPer100ml: 9999.0,
      maxSaltPer100ml: 9999.0,
      maxSaturatedFatPer100ml: 9999.0,
    },
  ];

  for (const t of thresholds) {
    await prisma.nutriGradeThreshold.upsert({
      where: { grade: t.grade },
      update: {
        maxSugarPer100ml: t.maxSugarPer100ml,
        maxSaltPer100ml: t.maxSaltPer100ml,
        maxSaturatedFatPer100ml: t.maxSaturatedFatPer100ml,
      },
      create: {
        grade: t.grade,
        maxSugarPer100ml: t.maxSugarPer100ml,
        maxSaltPer100ml: t.maxSaltPer100ml,
        maxSaturatedFatPer100ml: t.maxSaturatedFatPer100ml,
      },
    });
  }

  console.log('✅ Thresholds seeded (Indonesian Nutri-Level, per 100ml):');
  console.log('   Grade A: sugar ≤ 1.0g, salt ≤ 0.1g, sat. fat ≤ 0.7g');
  console.log('   Grade B: sugar ≤ 5.0g, salt ≤ 0.3g, sat. fat ≤ 1.2g');
  console.log('   Grade C: sugar ≤ 8.0g, salt ≤ 0.6g, sat. fat ≤ 2.8g');
  console.log('   Grade D: above Grade C thresholds');
  console.log('\n✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
