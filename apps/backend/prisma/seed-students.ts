import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { Gender, PrismaClient, StudentStatus } from '@prisma/client';

for (const candidate of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
]) {
  loadEnv({ path: candidate });
}

const prisma = new PrismaClient();

const COUNT = Number(process.env.SEED_STUDENT_COUNT ?? 1000);
const PREFIX = process.env.SEED_STUDENT_PREFIX ?? 'DUP';
const SCHOOL_CODE = process.env.SEED_SCHOOL_CODE ?? 'DEMO';

function admissionNo(index: number): string {
  return `${PREFIX}-${String(index).padStart(4, '0')}`;
}

async function main(): Promise<void> {
  const school = await prisma.school.findUnique({ where: { code: SCHOOL_CODE } });
  if (!school) {
    throw new Error(`School with code "${SCHOOL_CODE}" not found. Run the main seed first.`);
  }

  const year = new Date().getFullYear();
  const data = Array.from({ length: COUNT }, (_, index) => {
    const n = index + 1;
    return {
      schoolId: school.id,
      admissionNo: admissionNo(n),
      admissionDate: new Date(`${year}-06-01`),
      dateOfBirth: new Date(`${year - 12}-01-${String((index % 28) + 1).padStart(2, '0')}`),
      gender: n % 2 === 0 ? Gender.FEMALE : Gender.MALE,
      status: StudentStatus.ACTIVE,
    };
  });

  const result = await prisma.studentProfile.createMany({ data, skipDuplicates: true });
  const total = await prisma.studentProfile.count({ where: { schoolId: school.id } });

  console.log('\nStudent seed complete');
  console.log(`  School........: ${school.name} (${school.code})`);
  console.log(`  Requested.....: ${COUNT}`);
  console.log(`  Inserted......: ${result.count}`);
  console.log(`  Skipped.......: ${COUNT - result.count} (already existed)`);
  console.log(`  Total students: ${total}`);
}

main()
  .catch((error) => {
    console.error('Student seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
