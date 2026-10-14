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

const SCHOOL_CODE = process.env.SEED_SCHOOL_CODE ?? 'DEMO';
const STUDENT_PREFIX = process.env.SEED_STUDENT_PREFIX ?? 'DUP';
const CLASS_PREFIX = process.env.SEED_CLASS_PREFIX ?? 'CLASS';
const SECTION_NAME = process.env.SEED_SECTION_NAME ?? 'A';
const PER_CLASS = Number(process.env.SEED_PER_CLASS ?? 10);

async function main(): Promise<void> {
  const school = await prisma.school.findUnique({ where: { code: SCHOOL_CODE } });
  if (!school) {
    throw new Error(`School with code "${SCHOOL_CODE}" not found. Run the main seed first.`);
  }

  const classes = await prisma.classLevel.findMany({
    where: { schoolId: school.id, name: { startsWith: `${CLASS_PREFIX}-` } },
    orderBy: { numericLevel: 'asc' },
  });
  if (classes.length === 0) {
    throw new Error(`No classes matching "${CLASS_PREFIX}-*" found. Run the class seed first.`);
  }

  const students = await prisma.studentProfile.findMany({
    where: { schoolId: school.id, admissionNo: { startsWith: `${STUDENT_PREFIX}-` } },
    orderBy: { admissionNo: 'asc' },
  });

  const capacity = classes.length * PER_CLASS;
  if (students.length < capacity) {
    throw new Error(
      `Not enough students: ${students.length} found but ${capacity} needed ` +
        `(${classes.length} classes x ${PER_CLASS}). Run the student seed first.`,
    );
  }

  let cursor = 0;
  let assigned = 0;

  for (const cls of classes) {
    let section = await prisma.section.findFirst({
      where: { classLevelId: cls.id, name: SECTION_NAME },
    });
    if (!section) {
      section = await prisma.section.create({
        data: {
          schoolId: school.id,
          classLevelId: cls.id,
          name: SECTION_NAME,
          capacity: PER_CLASS,
        },
      });
    }

    const group = students.slice(cursor, cursor + PER_CLASS);
    cursor += PER_CLASS;

    await Promise.all(
      group
        .filter((student) => student.sectionId !== section!.id)
        .map((student) =>
          prisma.studentProfile.update({
            where: { id: student.id },
            data: { sectionId: section!.id },
          }),
        ),
    );
    assigned += group.length;
  }

  console.log('\nAssignment complete');
  console.log(`  School........: ${school.name} (${school.code})`);
  console.log(`  Classes.......: ${classes.length}`);
  console.log(`  Per class.....: ${PER_CLASS}`);
  console.log(`  Students set..: ${assigned}`);
  console.log(`  Left over.....: ${students.length - assigned}`);

  let failures = 0;
  for (const cls of classes) {
    const sections = await prisma.section.findMany({
      where: { classLevelId: cls.id },
      select: { id: true },
    });
    const count = await prisma.studentProfile.count({
      where: {
        sectionId: { in: sections.map((s) => s.id) },
        admissionNo: { startsWith: `${STUDENT_PREFIX}-` },
      },
    });
    if (count !== PER_CLASS) {
      failures += 1;
      console.log(`  ! ${cls.name}: ${count} students (expected ${PER_CLASS})`);
    }
  }

  console.log('\nVerification');
  console.log(`  Classes checked..: ${classes.length}`);
  console.log(`  Exactly ${PER_CLASS}......: ${classes.length - failures}`);
  console.log(`  Mismatches.......: ${failures}`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('Assignment failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
