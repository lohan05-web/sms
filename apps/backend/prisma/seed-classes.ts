import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

for (const candidate of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
]) {
  loadEnv({ path: candidate });
}

const prisma = new PrismaClient();

const COUNT = Number(process.env.SEED_CLASS_COUNT ?? 100);
const PREFIX = process.env.SEED_CLASS_PREFIX ?? 'CLASS';
const SCHOOL_CODE = process.env.SEED_SCHOOL_CODE ?? 'DEMO';

function className(index: number): string {
  return `${PREFIX}-${String(index).padStart(3, '0')}`;
}

async function main(): Promise<void> {
  const school = await prisma.school.findUnique({ where: { code: SCHOOL_CODE } });
  if (!school) {
    throw new Error(`School with code "${SCHOOL_CODE}" not found. Run the main seed first.`);
  }

  const data = Array.from({ length: COUNT }, (_, index) => ({
    schoolId: school.id,
    name: className(index + 1),
    numericLevel: index + 1,
  }));

  const result = await prisma.classLevel.createMany({ data, skipDuplicates: true });
  const total = await prisma.classLevel.count({ where: { schoolId: school.id } });

  console.log('\nClass seed complete');
  console.log(`  School........: ${school.name} (${school.code})`);
  console.log(`  Requested.....: ${COUNT}`);
  console.log(`  Inserted......: ${result.count}`);
  console.log(`  Skipped.......: ${COUNT - result.count} (already existed)`);
  console.log(`  Total classes.: ${total}`);
}

main()
  .catch((error) => {
    console.error('Class seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
