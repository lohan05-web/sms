import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { AttendanceStatus, PrismaClient } from '@prisma/client';

for (const candidate of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
]) {
  loadEnv({ path: candidate });
}

const prisma = new PrismaClient();

const SCHOOL_CODE = process.env.SEED_SCHOOL_CODE ?? 'DEMO';
const WORKING_DAYS = Number(process.env.SEED_ATTENDANCE_DAYS ?? 200);
const MAX_LEAVE = Number(process.env.SEED_ATTENDANCE_MAX_LEAVE ?? 15);
const BATCH_SIZE = 2000;

/** FNV-1a: stable per-student seed so re-runs produce identical data. */
function hashCode(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32 PRNG — deterministic given a seed. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The `count` most recent weekdays ending on `end` (inclusive), oldest first. */
function recentWorkingDays(count: number, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (days.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return days.reverse();
}

async function main(): Promise<void> {
  const school = await prisma.school.findUnique({ where: { code: SCHOOL_CODE } });
  if (!school) {
    throw new Error(`School with code "${SCHOOL_CODE}" not found. Run the main seed first.`);
  }

  const academicYear =
    (await prisma.academicYear.findFirst({ where: { schoolId: school.id, isCurrent: true } })) ??
    (await prisma.academicYear.findFirst({ where: { schoolId: school.id } }));
  if (!academicYear) throw new Error('No academic year found. Run the main seed first.');

  const students = await prisma.studentProfile.findMany({
    where: { schoolId: school.id, sectionId: { not: null } },
    select: { id: true, sectionId: true },
    orderBy: { admissionNo: 'asc' },
  });
  if (students.length === 0) {
    throw new Error('No sectioned students found. Run the student/class assignment seeds first.');
  }

  const days = recentWorkingDays(WORKING_DAYS, new Date());
  const from = days[0]!;
  const to = days[days.length - 1]!;

  const existing = await prisma.attendance.count({
    where: { date: { gte: from, lte: to }, studentId: { in: students.map((s) => s.id) } },
  });

  type Row = {
    studentId: string;
    sectionId: string;
    academicYearId: string;
    date: Date;
    status: AttendanceStatus;
  };

  let inserted = 0;
  let pending: Row[] = [];

  const flush = async (): Promise<void> => {
    if (pending.length === 0) return;
    const result = await prisma.attendance.createMany({ data: pending, skipDuplicates: true });
    inserted += result.count;
    pending = [];
  };

  for (const student of students) {
    const rng = mulberry32(hashCode(student.id));
    const leaveCount = Math.min(MAX_LEAVE, Math.floor(rng() * (MAX_LEAVE + 1)));

    // Choose which days are leave without repeats.
    const leaveIndexes = new Set<number>();
    while (leaveIndexes.size < leaveCount) {
      leaveIndexes.add(Math.floor(rng() * days.length));
    }

    days.forEach((date, index) => {
      pending.push({
        studentId: student.id,
        sectionId: student.sectionId!,
        academicYearId: academicYear.id,
        date,
        status: leaveIndexes.has(index) ? AttendanceStatus.EXCUSED : AttendanceStatus.PRESENT,
      });
    });
    if (pending.length >= BATCH_SIZE) await flush();
  }
  await flush();

  console.log('\nAttendance seed complete');
  console.log(`  School........: ${school.name} (${school.code})`);
  console.log(`  Window........: ${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`);
  console.log(`  Working days..: ${days.length}`);
  console.log(`  Students......: ${students.length}`);
  console.log(`  Expected rows.: ${students.length * days.length}`);
  console.log(`  Pre-existing..: ${existing}`);
  console.log(`  Inserted......: ${inserted}`);

  // ---- Verification -------------------------------------------------------
  const total = await prisma.attendance.count({
    where: { date: { gte: from, lte: to }, studentId: { in: students.map((s) => s.id) } },
  });
  const grouped = await prisma.attendance.groupBy({
    by: ['studentId'],
    where: { date: { gte: from, lte: to }, studentId: { in: students.map((s) => s.id) } },
    _count: { _all: true },
  });
  const wrongCount = grouped.filter((g) => g._count._all !== days.length).length;

  const byStatus = await prisma.attendance.groupBy({
    by: ['status'],
    where: { date: { gte: from, lte: to }, studentId: { in: students.map((s) => s.id) } },
    _count: { _all: true },
  });
  const statusLine = byStatus
    .map((s) => `${s.status.toLowerCase()}=${s._count._all}`)
    .join(' ');

  console.log('\nVerification');
  console.log(`  Total rows.....: ${total}`);
  console.log(`  Students checked: ${grouped.length}`);
  console.log(`  Students != ${days.length}: ${wrongCount}`);
  console.log(`  By status......: ${statusLine}`);
  if (total !== students.length * days.length || wrongCount > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('Attendance seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
