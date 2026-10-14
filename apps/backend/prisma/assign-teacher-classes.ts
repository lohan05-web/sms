import { config as loadEnv } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

for (const candidate of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
]) {
  loadEnv({ path: candidate });
}

const prisma = new PrismaClient();

const SCHOOL_CODE = process.env.SEED_SCHOOL_CODE ?? 'DEMO';
const CLASS_PREFIX = process.env.SEED_CLASS_PREFIX ?? 'CLASS';
const TEACHER_PREFIX = process.env.SEED_TEACHER_PREFIX ?? 'TCH';
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

const isTargetClass = (name: string): boolean => name.startsWith(`${CLASS_PREFIX}-`);

function teacherEmail(seq: number): string {
  return `teacher.${String(seq).padStart(4, '0')}@smartschool.local`;
}

function employeeNo(seq: number): string {
  return `${TEACHER_PREFIX}-${String(seq).padStart(4, '0')}`;
}

async function createTeacher(
  schoolId: string,
  startSeq: number,
  passwordHash: string,
): Promise<{ id: string; seq: number }> {
  let n = startSeq;
  let email = teacherEmail(n);
  let employee = employeeNo(n);
  // Skip any pre-existing user / employee number so we never create a duplicate.
  while (
    (await prisma.user.findUnique({ where: { email } })) ||
    (await prisma.teacherProfile.findFirst({ where: { schoolId, employeeNo: employee } }))
  ) {
    n += 1;
    email = teacherEmail(n);
    employee = employeeNo(n);
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Teacher',
      lastName: String(n).padStart(3, '0'),
      role: 'TEACHER',
      schoolId,
    },
  });
  const teacher = await prisma.teacherProfile.create({
    data: {
      userId: user.id,
      schoolId,
      employeeNo: employee,
      joiningDate: new Date(`${new Date().getFullYear()}-06-01`),
      status: 'ACTIVE',
    },
  });
  return { id: teacher.id, seq: n };
}

async function main(): Promise<void> {
  const school = await prisma.school.findUnique({ where: { code: SCHOOL_CODE } });
  if (!school) {
    throw new Error(`School with code "${SCHOOL_CODE}" not found. Run the main seed first.`);
  }

  const classes = await prisma.classLevel.findMany({
    where: { schoolId: school.id, name: { startsWith: `${CLASS_PREFIX}-` } },
    orderBy: { numericLevel: 'asc' },
    include: { sections: { orderBy: { name: 'asc' } } },
  });
  if (classes.length === 0) {
    throw new Error(`No classes matching "${CLASS_PREFIX}-*" found. Run the class seed first.`);
  }

  // Every class-teacher role in the whole school, so we never reuse a teacher
  // that already leads a class (including pre-existing, non-target classes).
  const allSections = await prisma.section.findMany({
    where: { schoolId: school.id },
    select: {
      classTeacherId: true,
      classLevel: { select: { name: true } },
    },
  });

  const reserved = new Set<string>();
  const classUsage = new Map<string, number>();
  for (const section of allSections) {
    const teacherId = section.classTeacherId;
    if (!teacherId) continue;
    if (isTargetClass(section.classLevel.name)) {
      classUsage.set(teacherId, (classUsage.get(teacherId) ?? 0) + 1);
    } else {
      reserved.add(teacherId);
    }
  }

  const preserved = new Set<string>();
  const toAssign: { name: string; sectionId: string }[] = [];
  for (const cls of classes) {
    const section = cls.sections[0];
    if (!section) throw new Error(`Class ${cls.name} has no section. Run the assignment seed first.`);
    const teacherId = section.classTeacherId;
    const valid = teacherId && !reserved.has(teacherId) && classUsage.get(teacherId) === 1;
    if (valid) {
      preserved.add(teacherId);
    } else {
      toAssign.push({ name: cls.name, sectionId: section.id });
      // Free an invalid / shared / reserved assignment before reassigning.
      if (teacherId) {
        await prisma.section.update({
          where: { id: section.id },
          data: { classTeacherId: null },
        });
      }
    }
  }

  const used = new Set<string>([...reserved, ...preserved]);
  const existingTeachers = await prisma.teacherProfile.findMany({
    where: { schoolId: school.id },
    orderBy: { employeeNo: 'asc' },
    select: { id: true },
  });
  const available = existingTeachers.filter((t) => !used.has(t.id));

  let reused = 0;
  let created = 0;
  let availableIndex = 0;
  let passwordHash: string | null = null;
  let createdPassword: string | null = null;
  let nextSeq = existingTeachers.length + 1;

  for (const target of toAssign) {
    let teacherId: string | undefined = available[availableIndex]?.id;
    if (teacherId) {
      availableIndex += 1;
      reused += 1;
    } else {
      if (!passwordHash) {
        createdPassword = randomBytes(12).toString('base64url');
        passwordHash = await bcrypt.hash(createdPassword, SALT_ROUNDS);
      }
      const teacher = await createTeacher(school.id, nextSeq, passwordHash);
      nextSeq = teacher.seq + 1;
      created += 1;
      teacherId = teacher.id;
    }
    await prisma.section.update({
      where: { id: target.sectionId },
      data: { classTeacherId: teacherId },
    });
    used.add(teacherId);
  }

  console.log('\nTeacher assignment complete');
  console.log(`  School..............: ${school.name} (${school.code})`);
  console.log(`  Target classes......: ${classes.length}`);
  console.log(`  Preserved...........: ${preserved.size}`);
  console.log(`  Teachers reused.....: ${reused}`);
  console.log(`  Teachers created....: ${created}`);
  if (createdPassword) {
    console.log(`  New teacher password: ${createdPassword} (shown once)`);
  }

  // ---- Verification -------------------------------------------------------
  const fresh = await prisma.classLevel.findMany({
    where: { schoolId: school.id, name: { startsWith: `${CLASS_PREFIX}-` } },
    include: { sections: { select: { id: true, classTeacherId: true } } },
  });
  const globalSections = await prisma.section.findMany({
    where: { schoolId: school.id, classTeacherId: { not: null } },
    select: { classTeacherId: true },
  });

  let missing = 0;
  for (const cls of fresh) {
    const teacherId = cls.sections.find((s) => s.classTeacherId)?.classTeacherId ?? null;
    if (!teacherId) {
      missing += 1;
      console.log(`  ! ${cls.name} has no class teacher`);
    }
  }

  const globalUsage = new Map<string, number>();
  for (const section of globalSections) {
    if (section.classTeacherId) {
      globalUsage.set(section.classTeacherId, (globalUsage.get(section.classTeacherId) ?? 0) + 1);
    }
  }
  const duplicates = [...globalUsage.values()].filter((count) => count > 1).length;

  console.log('\nVerification');
  console.log(`  Classes with a teacher..: ${fresh.length - missing}/${fresh.length}`);
  console.log(`  Classes without teacher.: ${missing}`);
  console.log(`  Duplicate teacher uses..: ${duplicates}`);
  if (missing > 0 || duplicates > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('Teacher assignment failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
