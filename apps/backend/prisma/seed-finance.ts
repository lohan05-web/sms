import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { InvoiceStatus, PrismaClient } from '@prisma/client';

for (const candidate of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
]) {
  loadEnv({ path: candidate });
}

const prisma = new PrismaClient();
const SCHOOL_CODE = process.env.SEED_SCHOOL_CODE ?? 'DEMO';
const BATCH_SIZE = 2000;

function dateOnly(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
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

  // Ensure fee category and structure exist
  const feeCategory = await prisma.feeCategory.upsert({
    where: { schoolId_name: { schoolId: school.id, name: 'Tuition' } },
    update: {},
    create: { schoolId: school.id, name: 'Tuition', description: 'Annual tuition fee' },
  });

  const classLevelIds = await prisma.classLevel.findMany({
    where: { schoolId: school.id },
    select: { id: true },
    orderBy: { numericLevel: 'asc' },
  });

  if (classLevelIds.length === 0) {
    throw new Error('No class levels found. Run the class seed first.');
  }

  for (const cls of classLevelIds) {
    await prisma.feeStructure.upsert({
      where: {
        academicYearId_classLevelId_feeCategoryId: {
          academicYearId: academicYear.id,
          classLevelId: cls.id,
          feeCategoryId: feeCategory.id,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        classLevelId: cls.id,
        feeCategoryId: feeCategory.id,
        amount: 1000,
        frequency: 'ANNUAL',
      },
    });
  }

  // Get all students
  const students = await prisma.studentProfile.findMany({
    where: { schoolId: school.id },
    select: { id: true, section: { select: { classLevelId: true } } },
    orderBy: { admissionNo: 'asc' },
  });

  let invoiceCreated = 0;
  let invoiceSkipped = 0;
  let paymentCreated = 0;
  let paymentSkipped = 0;

  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const chunk = students.slice(i, i + BATCH_SIZE);
    for (const student of chunk) {
      const classLevelId = student.section?.classLevelId ?? classLevelIds[0]?.id;
      if (!classLevelId) continue;

      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          academicYearId: academicYear.id,
          classLevelId,
          feeCategoryId: feeCategory.id,
        },
      });
      if (!feeStructure) continue;

      const invoiceNo = `INV-${academicYear.id.slice(-6)}-${student.id.slice(-6)}-${i + chunk.indexOf(student)}`;
      // simpler: generate with index
      const idx = students.indexOf(student);
      const finalInvoiceNo = `INV-${String(idx + 1).padStart(6, '0')}-${Date.now().toString().slice(-4)}`;

      // Check if invoice exists
      let invoice = await prisma.invoice.findFirst({
        where: { schoolId: school.id, studentId: student.id, academicYearId: academicYear.id },
      });

      if (invoice) {
        invoiceSkipped += 1;
      } else {
        invoice = await prisma.invoice.create({
          data: {
            schoolId: school.id,
            studentId: student.id,
            academicYearId: academicYear.id,
            invoiceNo: finalInvoiceNo,
            issueDate: dateOnly(Number(academicYear.name.split('-')[0]), 6, 1),
            dueDate: dateOnly(Number(academicYear.name.split('-')[0]), 7, 31),
            status: InvoiceStatus.PARTIALLY_PAID,
            subtotal: 1000,
            total: 1000,
            amountPaid: 500,
            balance: 500,
          },
        });
        invoiceCreated += 1;

        // Create invoice item
        await prisma.invoiceItem.upsert({
          where: {
            id: `item-${invoice.id}-${feeStructure.id}`,
          },
          update: {},
          create: {
            id: `item-${invoice.id}-${feeStructure.id}`,
            invoiceId: invoice.id,
            description: 'Tuition Fee - Annual',
            amount: 1000,
            feeStructureId: feeStructure.id,
          },
        });

        // Create payment
        const existingPayment = await prisma.payment.findFirst({
          where: { invoiceId: invoice.id },
        });
        if (!existingPayment) {
          await prisma.payment.create({
            data: {
              invoiceId: invoice.id,
              amount: 500,
              method: 'CASH',
              paidAt: dateOnly(Number(academicYear.name.split('-')[0]), 6, 15),
              notes: 'Partial payment - seed',
            },
          });
          paymentCreated += 1;
        } else {
          paymentSkipped += 1;
        }
      }
    }
  }

  console.log('\nFinance seed complete');
  console.log(`  Invoices created: ${invoiceCreated}, skipped: ${invoiceSkipped}`);
  console.log(`  Payments created: ${paymentCreated}, skipped: ${paymentSkipped}`);
  console.log(`  Total students: ${students.length}`);
}

main()
  .catch((error) => {
    console.error('Finance seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
