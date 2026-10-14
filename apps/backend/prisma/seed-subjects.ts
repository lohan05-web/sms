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

const COUNT = Number(process.env.SEED_SUBJECT_COUNT ?? 100);
const NAME_PREFIX = process.env.SEED_SUBJECT_PREFIX ?? 'SUBJ';
const CODE_PREFIX = process.env.SEED_SUBJECT_CODE_PREFIX ?? 'SUB';
const SCHOOL_CODE = process.env.SEED_SCHOOL_CODE ?? 'DEMO';

async function main(): Promise<void> {
  const school = await prisma.school.findUnique({ where: { code: SCHOOL_CODE } });
  if (!school) {
    throw new Error(`School with code "${SCHOOL_CODE}" not found. Run the main seed first.`);
  }

  const data = Array.from({ length: COUNT }, (_, index) => {
    const n = String(index + 1).padStart(3, '0');
    return {
      schoolId: school.id,
      name: `${NAME_PREFIX}-${n}`,
      code: `${CODE_PREFIX}-${n}`,
      isElective: false,
    };
  });

  const result = await prisma.subject.createMany({ data, skipDuplicates: true });
  const total = await prisma.subject.count({ where: { schoolId: school.id } });

  console.log('\nSubject seed complete');
  console.log(`  School........: ${school.name} (${school.code})`);
  console.log(`  Requested.....: ${COUNT}`);
  console.log(`  Inserted......: ${result.count}`);
  console.log(`  Skipped.......: ${COUNT - result.count} (already existed)`);
  console.log(`  Total subjects: ${total}`);
}

main()
  .catch((error) => {
    console.error('Subject seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
