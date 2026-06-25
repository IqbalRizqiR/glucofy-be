import { PrismaClient, NutriGrade } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Nutri-Grade Thresholds...');

  // Based on Indonesian Nutri-Level regulation (April 2026)
  // Values are MAX allowed per 100ml for each grade
  // The worst grade across all 3 params determines the final grade
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
      grade: NutriGrade.D,
      maxSugarPer100ml: Infinity,
      maxSaltPer100ml: Infinity,
      maxSaturatedFatPer100ml: Infinity,
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

  console.log('✅ Thresholds seeded:');
  console.log('   Grade A: sugar ≤ 1.0g, salt ≤ 0.1g, sat. fat ≤ 0.7g (per 100ml)');
  console.log('   Grade B: sugar ≤ 5.0g, salt ≤ 0.3g, sat. fat ≤ 1.2g (per 100ml)');
  console.log('   Grade C: sugar ≤ 8.0g, salt ≤ 0.6g, sat. fat ≤ 2.8g (per 100ml)');
  console.log('   Grade D: above Grade C thresholds');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
