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

// Deterministic cycles so existing teachers get a realistic spread of academic
// ranks and engagement types without relying on randomness.
const DESIGNATION_CYCLE = [
  'ASSISTANT_PROFESSOR',
  'ASSOCIATE_PROFESSOR',
  'LECTURER',
  'ASSISTANT_PROFESSOR',
  'PROFESSOR',
  'LECTURER',
  'ASSOCIATE_PROFESSOR',
  'ASSISTANT_PROFESSOR',
] as const;

const EMPLOYMENT_CYCLE = [
  'FULL_TIME',
  'FULL_TIME',
  'PART_TIME',
  'FULL_TIME',
  'CONTRACT',
  'FULL_TIME',
  'PART_TIME',
  'VISITING',
] as const;

async function main(): Promise<void> {
  const teachers = await prisma.teacherProfile.findMany({
    orderBy: { employeeNo: 'asc' },
    select: { id: true },
  });

  let updated = 0;
  for (let index = 0; index < teachers.length; index += 1) {
    const teacher = teachers[index];
    if (!teacher) continue;

    await prisma.teacherProfile.update({
      where: { id: teacher.id },
      data: {
        designation: DESIGNATION_CYCLE[index % DESIGNATION_CYCLE.length],
        employmentType: EMPLOYMENT_CYCLE[index % EMPLOYMENT_CYCLE.length],
      },
    });
    updated += 1;
  }

  const [byDesignation, byEmployment] = await Promise.all([
    prisma.teacherProfile.groupBy({ by: ['designation'], _count: { _all: true } }),
    prisma.teacherProfile.groupBy({ by: ['employmentType'], _count: { _all: true } }),
  ]);

  console.log('\nTeacher designation backfill complete');
  console.log(`  Updated..............: ${updated}`);
  console.log('  By designation.......:');
  for (const group of byDesignation) {
    console.log(`    ${group.designation.padEnd(20)} ${group._count._all}`);
  }
  console.log('  By employment type...:');
  for (const group of byEmployment) {
    console.log(`    ${group.employmentType.padEnd(20)} ${group._count._all}`);
  }
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
