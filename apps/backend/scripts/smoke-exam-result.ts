/**
 * Authenticated API smoke test: exam + exam-result create / retrieve / update /
 * cleanup.
 *
 * This exercises the *real* HTTP API (no direct database access, no auth
 * bypass): it signs in through `POST /auth/login/admin` with an existing
 * account, then uses only the public REST endpoints exactly as the web and
 * mobile clients do.
 *
 * Flow
 *   1. Log in and obtain an access token (never printed).
 *   2. Pick valid *existing* class level / academic year / subject / student
 *      records from the signed-in user's school (fetched via the API).
 *   3. Create a uniquely-named temporary exam (`EXAM_MANAGE`).
 *   4. Create a temporary exam result for that exam (`RESULT_MANAGE`), then
 *      update it.
 *   5. Verify each step by reading the records back through the API.
 *   6. Always clean up (delete the result, then the exam) in a `finally` block
 *      and verify the records are gone.
 *
 * The script only ever deletes the two records it created (tracked by id); it
 * never touches existing data. Credentials, tokens and password values are
 * never written to the output.
 *
 * Usage (from `apps/backend`, with the API already running):
 *
 *   npm run smoke:exam-result
 *
 * Credentials are read from the environment, falling back to the seeded
 * super-admin variables already present in the repo `.env`:
 *
 *   SMOKE_API_BASE        optional, default http://localhost:$PORT$API_PREFIX
 *   SMOKE_ADMIN_EMAIL     optional, default SEED_SUPER_ADMIN_EMAIL
 *   SMOKE_ADMIN_PASSWORD  optional, default SEED_SUPER_ADMIN_PASSWORD
 */

import { randomBytes } from 'node:crypto';

import { env } from '../src/config/env';

const API_BASE = (
  process.env.SMOKE_API_BASE ?? `http://localhost:${env.PORT}${env.API_PREFIX}`
).replace(/\/+$/, '');

const ADMIN_EMAIL =
  process.env.SMOKE_ADMIN_EMAIL ?? process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@smartschool.local';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD ?? process.env.SEED_SUPER_ADMIN_PASSWORD;

type Json = Record<string, any>;

interface ApiResponse {
  status: number;
  ok: boolean;
  body: Json | null;
}

const checks: { label: string; ok: boolean; detail?: string }[] = [];

function check(label: string, ok: boolean, detail?: string): void {
  checks.push({ label, ok, detail });
  if (!ok) {
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Perform an HTTP request against the API. Never logs headers or bodies. */
async function api(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<ApiResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await res.text();
  let body: Json | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as Json;
    } catch {
      body = null;
    }
  }
  return { status: res.status, ok: res.ok, body };
}

/** The server's error message for a failed response, safe to print. */
function serverMessage(res: ApiResponse): string {
  return res.body?.error?.message ?? `HTTP ${res.status}`;
}

async function listAll(path: string, token: string): Promise<Json[]> {
  const res = await api('GET', path, { token });
  if (!res.ok || !Array.isArray(res.body?.data)) {
    throw new Error(`GET ${path} failed (${serverMessage(res)})`);
  }
  return res.body!.data as Json[];
}

/** First item belonging to the given school (lists are unscoped for super-admins). */
function pickForSchool(items: Json[], schoolId: string | null): Json | undefined {
  if (!schoolId) return items[0];
  return items.find((item) => item.schoolId === schoolId) ?? items[0];
}

function todayIso(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  console.log(`SmartSchool exam/result API smoke test`);
  console.log(`API base: ${API_BASE}`);

  if (!ADMIN_PASSWORD) {
    throw new Error(
      'No test credentials found. Set SMOKE_ADMIN_PASSWORD (or SEED_SUPER_ADMIN_PASSWORD) and retry.',
    );
  }

  // --- 1. Authenticate (real login; token is never printed) -----------------
  console.log('\n[1] Authenticating');
  const login = await api('POST', '/auth/login/admin', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!login.ok || !login.body?.data?.accessToken) {
    throw new Error(`Login failed (${serverMessage(login)}). Check the API is running and the credentials.`);
  }
  const token = login.body.data.accessToken as string;
  const user = login.body.data.user as Json;
  const schoolId = (user.schoolId as string | null) ?? null;
  check('logged in', true, `role=${user.role} schoolId=${schoolId ?? 'none'}`);

  // --- 2. Gather valid existing records from the API ------------------------
  console.log('\n[2] Loading existing prerequisite records');
  const [classes, years, subjects, students] = await Promise.all([
    listAll('/classes?limit=100', token),
    listAll('/academic-years?limit=100', token),
    listAll('/subjects?limit=100', token),
    listAll('/students?limit=100', token),
  ]);

  const classLevel = pickForSchool(classes, schoolId);
  const academicYear = pickForSchool(years, schoolId);
  const subject = pickForSchool(subjects, schoolId);
  const student = pickForSchool(students, schoolId);

  if (!classLevel || !academicYear || !subject || !student) {
    throw new Error(
      'Missing prerequisite data: need at least one class level, academic year, subject and student in the account\'s school. Seed the database and retry.',
    );
  }

  const classLevelId = String(classLevel.id);
  const academicYearId = String(academicYear.id);
  const subjectId = String(subject.id);
  const studentId = String(student.id);
  check('found class level', Boolean(classLevelId), classLevelId);
  check('found academic year', Boolean(academicYearId), academicYearId);
  check('found subject', Boolean(subjectId), subjectId);
  check('found student', Boolean(studentId), studentId);

  const stamp = `${Date.now()}-${randomBytes(3).toString('hex')}`;
  const examName = `[SMOKE] Exam ${stamp}`;

  let examId: string | undefined;
  let resultId: string | undefined;
  let fatal: Error | null = null;

  try {
    // --- 3. Create a temporary exam ----------------------------------------
    console.log('\n[3] Creating a temporary exam');
    const createExam = await api('POST', '/exams', {
      token,
      body: {
        classLevelId,
        academicYearId,
        // Accepted by the validator; the current exams service does not persist it.
        subjectId,
        name: examName,
        examType: 'UNIT_TEST',
        maxMarks: 50,
        passingMarks: 10,
        startDate: todayIso(0),
        endDate: todayIso(7),
      },
    });
    check('exam created (201)', createExam.status === 201, serverMessage(createExam));
    examId = createExam.body?.data?.id ? String(createExam.body.data.id) : undefined;
    check('exam id returned', Boolean(examId));
    if (!examId) throw new Error('Exam creation did not return an id; aborting.');

    const getExam = await api('GET', `/exams/${examId}`, { token });
    check('exam retrieved by id (200)', getExam.status === 200, serverMessage(getExam));
    check('retrieved exam matches', getExam.body?.data?.id === examId && getExam.body?.data?.name === examName);

    // --- 4. Create a temporary exam result ---------------------------------
    console.log('\n[4] Creating a temporary exam result');
    const createResult = await api('POST', '/exam-results', {
      token,
      body: { examId, studentId, subjectId, marksObtained: 40 },
    });
    check('result created (201)', createResult.status === 201, serverMessage(createResult));
    resultId = createResult.body?.data?.id ? String(createResult.body.data.id) : undefined;
    check('result id returned', Boolean(resultId));
    check('result marks = 40', Number(createResult.body?.data?.marksObtained) === 40);
    // Grade is computed server-side when omitted from the payload.
    check('result grade auto-computed', Boolean(createResult.body?.data?.grade));
    if (!resultId) throw new Error('Result creation did not return an id; aborting.');

    // --- 5. Retrieve through the API ---------------------------------------
    console.log('\n[5] Verifying retrieval');
    const getResult = await api('GET', `/exam-results/${resultId}`, { token });
    check('result retrieved by id (200)', getResult.status === 200, serverMessage(getResult));
    check('retrieved result matches', getResult.body?.data?.id === resultId && Number(getResult.body?.data?.marksObtained) === 40);

    const byExam = await listAll(`/exam-results?examId=${examId}&limit=100`, token);
    check('result appears in exam filter', byExam.some((row) => row.id === resultId));

    const byExamSearch = await listAll(`/exams?search=${encodeURIComponent(examName)}&limit=100`, token);
    check('exam appears in search', byExamSearch.some((row) => row.id === examId));

    const reportCard = await api(
      'GET',
      `/exam-results/report-card?studentId=${studentId}&examId=${examId}`,
      { token },
    );
    check('report card retrievable (200)', reportCard.status === 200, serverMessage(reportCard));

    // --- 6. Update the result ----------------------------------------------
    console.log('\n[6] Updating the temporary result');
    const patch = await api('PATCH', `/exam-results/${resultId}`, {
      token,
      body: { marksObtained: 48, grade: 'A', remarks: `smoke ${stamp}` },
    });
    check('result updated (200)', patch.status === 200, serverMessage(patch));

    const getUpdated = await api('GET', `/exam-results/${resultId}`, { token });
    check('updated marks = 48', Number(getUpdated.body?.data?.marksObtained) === 48);
    check('updated grade = A', getUpdated.body?.data?.grade === 'A');
  } catch (error) {
    fatal = error instanceof Error ? error : new Error(String(error));
  } finally {
    // --- 7. Clean up (dependent record first, then the exam) ---------------
    console.log('\n[7] Cleaning up temporary records');
    if (resultId) {
      const del = await api('DELETE', `/exam-results/${resultId}`, { token });
      check('result deleted', del.ok, serverMessage(del));
      const gone = await api('GET', `/exam-results/${resultId}`, { token });
      check('result no longer retrievable', gone.status === 404, `status ${gone.status}`);
    }
    if (examId) {
      const del = await api('DELETE', `/exams/${examId}`, { token });
      check('exam deleted', del.ok, serverMessage(del));
      const gone = await api('GET', `/exams/${examId}`, { token });
      check('exam no longer retrievable', gone.status === 404, `status ${gone.status}`);
    }
  }

  // --- Report ---------------------------------------------------------------
  const failures = checks.filter((c) => !c.ok);
  console.log('\n----------------------------------------');
  if (fatal) console.log(`Aborted: ${fatal.message}`);
  console.log(`Checks: ${checks.length - failures.length}/${checks.length} passed.`);
  if (failures.length === 0 && !fatal) {
    console.log('SMOKE TEST PASSED — created, retrieved, updated and removed all temporary data.');
    process.exitCode = 0;
  } else {
    console.log('SMOKE TEST FAILED.');
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(`\nFATAL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
