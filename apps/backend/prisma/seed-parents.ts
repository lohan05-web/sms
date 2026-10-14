import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient, GuardianRelation, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

for (const candidate of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
]) {
  loadEnv({ path: candidate });
}

const prisma = new PrismaClient();
const SCHOOL_CODE = process.env.SEED_SCHOOL_CODE ?? 'DEMO';
const SALT_ROUNDS = 12;

async function main(): Promise<void> {
  const school = await prisma.school.findUnique({ where: { code: SCHOOL_CODE } });
  if (!school) {
    throw new Error(`School with code "${SCHOOL_CODE}" not found. Run the main seed first.`);
  }

  const students = await prisma.studentProfile.findMany({
    where: { schoolId: school.id },
    select: { id: true, admissionNo: true },
    orderBy: { admissionNo: 'asc' },
  });

  let parentsCreated = 0;
  let linksCreated = 0;
  let parentsSkipped = 0;
  let linksSkipped = 0;

  for (const student of students) {
    const idx = student.admissionNo.replace('DEMO-', '').replace('DUP-', '');
    const parentEmail = `parent.${idx}@demo.local`.toLowerCase();

    let guardian = await prisma.guardian.findFirst({
      where: { schoolId: school.id, email: parentEmail },
    });

    if (!guardian) {
      const passwordHash = await bcrypt.hash('password123', SALT_ROUNDS);
      // Create user
      let user = await prisma.user.findUnique({ where: { email: parentEmail } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: parentEmail,
            passwordHash,
            firstName: 'Parent',
            lastName: idx,
            role: Role.PARENT,
            schoolId: school.id,
          },
        });
      }

      guardian = await prisma.guardian.create({
        data: {
          schoolId: school.id,
          userId: user.id,
          firstName: 'Parent',
          lastName: idx,
          email: parentEmail,
          phone: '',
        },
      });
      parentsCreated += 1;
    } else {
      parentsSkipped += 1;
    }

    // Link guardian to student
    const existingLink = await prisma.studentGuardian.findFirst({
      where: { studentId: student.id, guardianId: guardian.id },
    });
    if (!existingLink) {
      await prisma.studentGuardian.create({
        data: {
          studentId: student.id,
          guardianId: guardian.id,
          relation: GuardianRelation.FATHER,
          isPrimary: true,
        },
      });
      linksCreated += 1;
    } else {
      linksSkipped += 1;
    }
  }

  console.log('\nParent seed complete');
  console.log(`  Parents created: ${parentsCreated}, skipped: ${parentsSkipped}`);
  console.log(`  Links created: ${linksCreated}, skipped: ${linksSkipped}`);
  console.log(`  Total students: ${students.length}`);
}

main()
  .catch((error) => {
    console.error('Parent seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
