import {
  AttendanceStatus,
  ExamType,
  FeeFrequency,
  InvoiceStatus,
  LoanStatus,
  PaymentMethod,
  TransportStatus,
  VehicleStatus,
} from '@prisma/client';
import {
  createAcademicYearSchema,
  createAttendanceSchema,
  createBookLoanSchema,
  createBookSchema,
  createClassLevelSchema,
  createExamResultSchema,
  createExamSchema,
  createFeeCategorySchema,
  createFeeStructureSchema,
  createGuardianSchema,
  createNoticeSchema,
  createSectionSchema,
  createStudentSchema,
  createSubjectSchema,
  createTeacherSchema,
  createTermSchema,
  createTransportRouteSchema,
  createTransportSubscriptionSchema,
  createUserSchema,
  createVehicleSchema,
  createRouteStopSchema,
  Permission,
  ROLE_LABELS,
  ROLES,
  updateAcademicYearSchema,
  updateAttendanceSchema,
  updateBookLoanSchema,
  updateBookSchema,
  updateClassLevelSchema,
  updateExamResultSchema,
  updateExamSchema,
  updateFeeCategorySchema,
  updateFeeStructureSchema,
  updateGuardianSchema,
  updateInvoiceSchema,
  updateNoticeSchema,
  updatePaymentSchema,
  updateSchoolSchema,
  updateSectionSchema,
  updateStudentSchema,
  updateSubjectSchema,
  updateTeacherSchema,
  updateTermSchema,
  updateTransportRouteSchema,
  updateTransportSubscriptionSchema,
  updateUserSchema,
  updateVehicleSchema,
  updateRouteStopSchema,
  type Role,
} from '@smartschool/shared';
import type { ReactNode } from 'react';
import { requiredSchema, type FieldDef, type ParseableSchema } from './lib/form';
import type { Option } from './lib/options';
import {
  asString,
  formatCurrency,
  formatDate,
  formatDateTime,
  humanize,
  shortId,
} from './lib/format';

export type Row = Record<string, unknown>;

export interface Column<T extends Row = Row> {
  header: string;
  render: (row: T) => ReactNode;
}

export interface FormSpec {
  fields: FieldDef[];
  schema: ParseableSchema;
}

export interface RowActionsConfig {
  /** Allow admins to activate/deactivate the linked login account. */
  toggleActive?: boolean;
  /** Allow admins to generate a new password for the linked login account. */
  resetPassword?: boolean;
  /** Allow admins to upload/replace the record's photo. */
  photo?: boolean;
}

export interface ResourceConfig {
  key: string;
  label: string;
  apiPath: string;
  permission: Permission;
  searchable?: boolean;
  columns: Column[];
  createPermission?: Permission;
  updatePermission?: Permission;
  deletePermission?: Permission;
  deletable?: boolean;
  createHref?: string;
  form?: { create?: FormSpec; edit?: FormSpec };
  rowActions?: RowActionsConfig;
}

function path(row: Row, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Row)[part];
    return undefined;
  }, row);
}

function firstOf(row: Row, ...paths: string[]): unknown {
  for (const p of paths) {
    const value = path(row, p);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function text(value: unknown): ReactNode {
  const out = asString(value);
  return out || '—';
}

function personName(row: Row, prefix = ''): string {
  const base = prefix ? `${prefix}.` : '';
  const first = asString(firstOf(row, `${base}firstName`));
  const last = asString(firstOf(row, `${base}lastName`));
  const name = `${first} ${last}`.trim();
  return name;
}

function nameColumn(header = 'Name', prefix = ''): Column {
  return {
    header,
    render: (row) => {
      const name = personName(row, prefix);
      return text(name || firstOf(row, `${prefix}name`, `${prefix}title`));
    },
  };
}

const createdColumn: Column = {
  header: 'Created',
  render: (row) => text(formatDate(firstOf(row, 'createdAt'))),
};

function personColumn(header: string, prefix = 'student'): Column {
  return {
    header,
    render: (row) => {
      const name = personName(row, prefix);
      if (name) return text(name);
      const fallback = asString(firstOf(row, `${prefix}.admissionNo`, `${prefix}.email`));
      return text(fallback || shortId(firstOf(row, `${prefix}.id`, 'studentId')));
    },
  };
}

/** Yes/No for the linked login account's active flag. */
function accountActiveLabel(row: Row): ReactNode {
  const value = firstOf(row, 'user.isActive', 'isActive');
  if (value === undefined || value === null) return '—';
  return value ? 'Yes' : 'No';
}

/** Number of children linked to a parent record. */
function childCount(row: Row): string {
  const links = row.students;
  return Array.isArray(links) ? String(links.length) : '0';
}

/** Current active students vs. the section's maximum capacity, e.g. "3 / 10". */
function enrollmentLabel(row: Row): string {
  const count = asString(firstOf(row, '_count.students', 'studentCount')) || '0';
  const capacity = asString(firstOf(row, 'capacity'));
  return capacity ? `${count} / ${capacity}` : count;
}

/* Field helpers ----------------------------------------------------------- */

function choiceOptions(values: readonly string[]): Option[] {
  return values.map((value) => ({ value, label: humanize(value) }));
}

const GENDER_OPTIONS = choiceOptions(['MALE', 'FEMALE', 'OTHER']);
const STUDENT_STATUS_OPTIONS = choiceOptions([
  'ACTIVE',
  'INACTIVE',
  'GRADUATED',
  'TRANSFERRED',
  'SUSPENDED',
]);
const TEACHER_STATUS_OPTIONS = choiceOptions(['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED']);
const GUARDIAN_RELATION_OPTIONS = choiceOptions(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']);
const ROLE_OPTIONS: Option[] = ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));
const ATTENDANCE_STATUS_OPTIONS = choiceOptions(Object.values(AttendanceStatus));
const EXAM_TYPE_OPTIONS = choiceOptions(Object.values(ExamType));
const FEE_FREQUENCY_OPTIONS = choiceOptions(Object.values(FeeFrequency));
const INVOICE_STATUS_OPTIONS = choiceOptions(Object.values(InvoiceStatus));
const LOAN_STATUS_OPTIONS = choiceOptions(Object.values(LoanStatus));
const PAYMENT_METHOD_OPTIONS = choiceOptions(Object.values(PaymentMethod));
const TRANSPORT_STATUS_OPTIONS = choiceOptions(Object.values(TransportStatus));
const VEHICLE_STATUS_OPTIONS = choiceOptions(Object.values(VehicleStatus));

function textField(name: string, label: string, options: Partial<FieldDef> = {}): FieldDef {
  return { name, label, type: 'text', ...options };
}

export const RESOURCES: ResourceConfig[] = [
  {
    key: 'users',
    label: 'Users',
    apiPath: '/users',
    permission: Permission.USER_READ,
    searchable: true,
    createPermission: Permission.USER_CREATE,
    updatePermission: Permission.USER_UPDATE,
    deletePermission: Permission.USER_DELETE,
    deletable: true,
    columns: [
      nameColumn(),
      { header: 'Email', render: (row) => text(firstOf(row, 'email')) },
      {
        header: 'Role',
        render: (row) => {
          const role = asString(firstOf(row, 'role')) as Role;
          return text(ROLE_LABELS[role] ?? role);
        },
      },
      { header: 'Active', render: (row) => (row.isActive === false ? 'No' : 'Yes') },
      { header: 'Last login', render: (row) => text(formatDateTime(firstOf(row, 'lastLoginAt'))) },
    ],
    form: {
      create: {
        fields: [
          textField('firstName', 'First name', { required: true }),
          textField('lastName', 'Last name', { required: true }),
          textField('email', 'Email', { type: 'email', required: true }),
          textField('password', 'Password', {
            type: 'password',
            required: true,
            help: 'Min 8 chars, letter + number',
          }),
          textField('phone', 'Phone'),
          { name: 'role', label: 'Role', type: 'select', required: true, options: ROLE_OPTIONS },
        ],
        schema: createUserSchema,
      },
      edit: {
        fields: [
          textField('firstName', 'First name'),
          textField('lastName', 'Last name'),
          textField('phone', 'Phone'),
          { name: 'role', label: 'Role', type: 'select', options: ROLE_OPTIONS },
          { name: 'isActive', label: 'Active', type: 'checkbox' },
        ],
        schema: updateUserSchema,
      },
    },
  },
  {
    key: 'students',
    label: 'Students',
    apiPath: '/students',
    permission: Permission.STUDENT_READ,
    searchable: true,
    createPermission: Permission.STUDENT_CREATE,
    updatePermission: Permission.STUDENT_UPDATE,
    deletePermission: Permission.STUDENT_DELETE,
    deletable: true,
    rowActions: { photo: true },
    columns: [
      { header: 'Admission No', render: (row) => text(firstOf(row, 'admissionNo')) },
      nameColumn(),
      { header: 'Roll No', render: (row) => text(firstOf(row, 'rollNo')) },
      { header: 'Gender', render: (row) => text(humanize(firstOf(row, 'gender'))) },
      { header: 'Status', render: (row) => text(humanize(firstOf(row, 'status'))) },
    ],
    form: {
      create: {
        fields: [
          textField('firstName', 'First name', { required: true }),
          textField('lastName', 'Last name', { required: true }),
          textField('admissionNo', 'Admission no', { required: true }),
          textField('admissionDate', 'Admission date', { type: 'date', required: true }),
          textField('dateOfBirth', 'Date of birth', { type: 'date', required: true }),
          {
            name: 'gender',
            label: 'Gender',
            type: 'select',
            required: true,
            options: GENDER_OPTIONS,
          },
          textField('email', 'Email', { type: 'email' }),
          textField('password', 'Password', {
            type: 'password',
            help: 'Optional — creates a login',
          }),
          textField('phone', 'Phone'),
          textField('rollNo', 'Roll no'),
          { name: 'sectionId', label: 'Section', type: 'select', lookup: 'sections' },
          textField('bloodGroup', 'Blood group'),
          textField('address', 'Address', { type: 'textarea' }),
        ],
        schema: createStudentSchema,
      },
      edit: {
        fields: [
          textField('firstName', 'First name'),
          textField('lastName', 'Last name'),
          textField('phone', 'Phone'),
          textField('rollNo', 'Roll no'),
          { name: 'sectionId', label: 'Section', type: 'select', lookup: 'sections' },
          { name: 'status', label: 'Status', type: 'select', options: STUDENT_STATUS_OPTIONS },
          textField('address', 'Address', { type: 'textarea' }),
        ],
        schema: updateStudentSchema,
      },
    },
  },
  {
    key: 'guardians',
    label: 'Parents',
    apiPath: '/guardians',
    permission: Permission.PARENT_READ,
    searchable: true,
    createPermission: Permission.PARENT_MANAGE,
    updatePermission: Permission.PARENT_MANAGE,
    deletePermission: Permission.PARENT_MANAGE,
    deletable: true,
    rowActions: { toggleActive: true, resetPassword: true },
    columns: [
      nameColumn(),
      { header: 'Phone', render: (row) => text(firstOf(row, 'phone')) },
      { header: 'Email', render: (row) => text(firstOf(row, 'email')) },
      { header: 'Children', render: (row) => text(childCount(row)) },
      { header: 'Active', render: (row) => accountActiveLabel(row) },
    ],
    form: {
      create: {
        fields: [
          textField('firstName', 'First name', { required: true }),
          textField('lastName', 'Last name', { required: true }),
          textField('phone', 'Phone', { required: true }),
          {
            name: 'relation',
            label: 'Relation',
            type: 'select',
            options: GUARDIAN_RELATION_OPTIONS,
            defaultValue: 'GUARDIAN',
          },
          textField('occupation', 'Occupation'),
          textField('email', 'Email', {
            type: 'email',
            help: 'Creates a login. A secure password is generated automatically.',
          }),
          {
            name: 'studentIds',
            label: 'Children',
            type: 'multiselect',
            lookup: 'students',
            help: 'Link this parent to their child / children.',
          },
          textField('address', 'Address', { type: 'textarea' }),
        ],
        schema: createGuardianSchema,
      },
      edit: {
        fields: [
          textField('firstName', 'First name'),
          textField('lastName', 'Last name'),
          textField('phone', 'Phone'),
          textField('occupation', 'Occupation'),
          textField('address', 'Address', { type: 'textarea' }),
          {
            name: 'studentIds',
            label: 'Children',
            type: 'multiselect',
            lookup: 'students',
            toValue: (row) =>
              Array.isArray(row.students)
                ? (row.students as Row[]).map((link) => link.studentId)
                : [],
          },
        ],
        schema: updateGuardianSchema,
      },
    },
  },
  {
    key: 'teachers',
    label: 'Teachers',
    apiPath: '/teachers',
    permission: Permission.TEACHER_MANAGE,
    searchable: true,
    createPermission: Permission.TEACHER_MANAGE,
    updatePermission: Permission.TEACHER_MANAGE,
    deletePermission: Permission.TEACHER_MANAGE,
    deletable: true,
    rowActions: { toggleActive: true, resetPassword: true },
    columns: [
      nameColumn('Teacher'),
      { header: 'Employee No', render: (row) => text(firstOf(row, 'employeeNo')) },
      { header: 'Email', render: (row) => text(firstOf(row, 'user.email', 'email')) },
      {
        header: 'Status',
        render: (row) => text(humanize(firstOf(row, 'status', 'employmentStatus'))),
      },
      { header: 'Active', render: (row) => accountActiveLabel(row) },
    ],
    form: {
      create: {
        fields: [
          textField('firstName', 'First name', { required: true }),
          textField('lastName', 'Last name', { required: true }),
          textField('employeeNo', 'Employee no', { required: true }),
          textField('joiningDate', 'Joining date', { type: 'date', required: true }),
          textField('email', 'Email', {
            type: 'email',
            required: true,
            help: 'The teacher signs in with this email. A secure password is generated automatically.',
          }),
          textField('phone', 'Phone'),
          textField('qualification', 'Qualification'),
          textField('specialization', 'Specialization'),
        ],
        schema: createTeacherSchema,
      },
      edit: {
        fields: [
          textField('firstName', 'First name'),
          textField('lastName', 'Last name'),
          textField('phone', 'Phone'),
          textField('qualification', 'Qualification'),
          textField('specialization', 'Specialization'),
          { name: 'status', label: 'Status', type: 'select', options: TEACHER_STATUS_OPTIONS },
        ],
        schema: updateTeacherSchema,
      },
    },
  },
  {
    key: 'classes',
    label: 'Class Levels',
    apiPath: '/classes',
    permission: Permission.CLASS_READ,
    createPermission: Permission.CLASS_MANAGE,
    updatePermission: Permission.CLASS_MANAGE,
    deletePermission: Permission.CLASS_MANAGE,
    deletable: true,
    columns: [
      nameColumn(),
      { header: 'Order', render: (row) => text(firstOf(row, 'order', 'level', 'numericLevel')) },
      createdColumn,
    ],
    form: {
      create: {
        fields: [
          textField('name', 'Name', { required: true }),
          { name: 'numericLevel', label: 'Numeric level', type: 'number', required: true, min: 1 },
        ],
        schema: createClassLevelSchema,
      },
      edit: {
        fields: [
          textField('name', 'Name'),
          { name: 'numericLevel', label: 'Numeric level', type: 'number', min: 1 },
        ],
        schema: updateClassLevelSchema,
      },
    },
  },
  {
    key: 'sections',
    label: 'Sections',
    apiPath: '/sections',
    permission: Permission.CLASS_READ,
    createPermission: Permission.CLASS_MANAGE,
    updatePermission: Permission.CLASS_MANAGE,
    deletePermission: Permission.CLASS_MANAGE,
    deletable: true,
    columns: [
      nameColumn(),
      { header: 'Class', render: (row) => text(firstOf(row, 'classLevel.name', 'classLevelId')) },
      { header: 'Students', render: (row) => enrollmentLabel(row) },
    ],
    form: {
      create: {
        fields: [
          {
            name: 'classLevelId',
            label: 'Class',
            type: 'select',
            required: true,
            lookup: 'classes',
          },
          textField('name', 'Name', { required: true }),
          {
            name: 'capacity',
            label: 'Capacity',
            type: 'number',
            min: 1,
            max: 10,
            help: 'Maximum students (1–10)',
          },
          { name: 'classTeacherId', label: 'Class teacher', type: 'select', lookup: 'teachers' },
        ],
        schema: createSectionSchema,
      },
      edit: {
        fields: [
          textField('name', 'Name'),
          {
            name: 'capacity',
            label: 'Capacity',
            type: 'number',
            min: 1,
            max: 10,
            help: 'Maximum students (1–10)',
          },
          { name: 'classTeacherId', label: 'Class teacher', type: 'select', lookup: 'teachers' },
        ],
        schema: updateSectionSchema,
      },
    },
  },
  {
    key: 'subjects',
    label: 'Subjects',
    apiPath: '/subjects',
    permission: Permission.SUBJECT_READ,
    createPermission: Permission.SUBJECT_MANAGE,
    updatePermission: Permission.SUBJECT_MANAGE,
    deletePermission: Permission.SUBJECT_MANAGE,
    deletable: true,
    columns: [
      nameColumn(),
      { header: 'Code', render: (row) => text(firstOf(row, 'code')) },
      { header: 'Credits', render: (row) => text(firstOf(row, 'credits')) },
    ],
    form: {
      create: {
        fields: [
          textField('name', 'Name', { required: true }),
          textField('code', 'Code', { required: true }),
          textField('description', 'Description', { type: 'textarea' }),
          { name: 'isElective', label: 'Elective', type: 'checkbox' },
        ],
        schema: createSubjectSchema,
      },
      edit: {
        fields: [
          textField('name', 'Name'),
          textField('code', 'Code'),
          textField('description', 'Description', { type: 'textarea' }),
          { name: 'isElective', label: 'Elective', type: 'checkbox' },
        ],
        schema: updateSubjectSchema,
      },
    },
  },
  {
    key: 'academic-years',
    label: 'Academic Years',
    apiPath: '/academic-years',
    permission: Permission.ACADEMIC_READ,
    createPermission: Permission.ACADEMIC_MANAGE,
    updatePermission: Permission.ACADEMIC_MANAGE,
    deletePermission: Permission.ACADEMIC_MANAGE,
    deletable: true,
    columns: [
      nameColumn('Year'),
      { header: 'Start', render: (row) => text(formatDate(firstOf(row, 'startDate'))) },
      { header: 'End', render: (row) => text(formatDate(firstOf(row, 'endDate'))) },
      { header: 'Current', render: (row) => (row.isCurrent ? 'Yes' : 'No') },
    ],
    form: {
      create: {
        fields: [
          textField('name', 'Name', { required: true }),
          textField('startDate', 'Start date', { type: 'date', required: true }),
          textField('endDate', 'End date', { type: 'date', required: true }),
          { name: 'isCurrent', label: 'Current year', type: 'checkbox' },
        ],
        schema: createAcademicYearSchema,
      },
      edit: {
        fields: [
          textField('name', 'Name'),
          textField('startDate', 'Start date', { type: 'date' }),
          textField('endDate', 'End date', { type: 'date' }),
          { name: 'isCurrent', label: 'Current year', type: 'checkbox' },
        ],
        schema: updateAcademicYearSchema,
      },
    },
  },
  {
    key: 'terms',
    label: 'Terms',
    apiPath: '/terms',
    permission: Permission.ACADEMIC_READ,
    createPermission: Permission.ACADEMIC_MANAGE,
    updatePermission: Permission.ACADEMIC_MANAGE,
    deletePermission: Permission.ACADEMIC_MANAGE,
    deletable: true,
    columns: [
      nameColumn('Term'),
      { header: 'Academic Year', render: (row) => text(firstOf(row, 'academicYear.name')) },
      { header: 'Start', render: (row) => text(formatDate(firstOf(row, 'startDate'))) },
      { header: 'End', render: (row) => text(formatDate(firstOf(row, 'endDate'))) },
      { header: 'Current', render: (row) => (row.isCurrent ? 'Yes' : 'No') },
    ],
    form: {
      create: {
        fields: [
          {
            name: 'academicYearId',
            label: 'Academic year',
            type: 'select',
            required: true,
            lookup: 'academicYears',
          },
          textField('name', 'Name', { required: true }),
          textField('startDate', 'Start date', { type: 'date', required: true }),
          textField('endDate', 'End date', { type: 'date', required: true }),
          { name: 'isCurrent', label: 'Current term', type: 'checkbox' },
        ],
        schema: createTermSchema,
      },
      edit: {
        fields: [
          textField('name', 'Name'),
          textField('startDate', 'Start date', { type: 'date' }),
          textField('endDate', 'End date', { type: 'date' }),
          { name: 'isCurrent', label: 'Current term', type: 'checkbox' },
        ],
        schema: updateTermSchema,
      },
    },
  },
  {
    key: 'teacher-assignments',
    label: 'Teacher Assignments',
    apiPath: '/teacher-assignments',
    permission: Permission.TEACHER_READ,
    createPermission: Permission.TEACHER_MANAGE,
    deletePermission: Permission.TEACHER_MANAGE,
    deletable: true,
    columns: [
      {
        header: 'Teacher',
        render: (row) =>
          text(
            personName(row, 'teacher') ||
              personName(row, 'teacher.user') ||
              firstOf(row, 'teacherId'),
          ),
      },
      { header: 'Subject', render: (row) => text(firstOf(row, 'subject.name', 'subjectId')) },
      { header: 'Class', render: (row) => text(firstOf(row, 'classLevel.name', 'classLevelId')) },
      { header: 'Section', render: (row) => text(firstOf(row, 'section.name', 'sectionId')) },
    ],
    form: {
      create: {
        fields: [
          {
            name: 'teacherId',
            label: 'Teacher',
            type: 'select',
            required: true,
            lookup: 'teachers',
          },
          {
            name: 'subjectId',
            label: 'Subject',
            type: 'select',
            required: true,
            lookup: 'subjects',
          },
          {
            name: 'classLevelId',
            label: 'Class',
            type: 'select',
            required: true,
            lookup: 'classes',
          },
          { name: 'sectionId', label: 'Section', type: 'select', lookup: 'sections' },
        ],
        schema: requiredSchema([
          { name: 'teacherId', label: 'Teacher', type: 'select', required: true },
          { name: 'subjectId', label: 'Subject', type: 'select', required: true },
          { name: 'classLevelId', label: 'Class', type: 'select', required: true },
        ]),
      },
    },
  },
  {
    key: 'class-subjects',
    label: 'Class Subjects',
    apiPath: '/class-subjects',
    permission: Permission.CLASS_READ,
    createPermission: Permission.CLASS_MANAGE,
    deletePermission: Permission.CLASS_MANAGE,
    deletable: true,
    columns: [
      { header: 'Class', render: (row) => text(firstOf(row, 'classLevel.name', 'classLevelId')) },
      { header: 'Subject', render: (row) => text(firstOf(row, 'subject.name', 'subjectId')) },
    ],
    form: {
      create: {
        fields: [
          {
            name: 'classLevelId',
            label: 'Class',
            type: 'select',
            required: true,
            lookup: 'classes',
          },
          {
            name: 'subjectId',
            label: 'Subject',
            type: 'select',
            required: true,
            lookup: 'subjects',
          },
        ],
        schema: requiredSchema([
          { name: 'classLevelId', label: 'Class', type: 'select', required: true },
          { name: 'subjectId', label: 'Subject', type: 'select', required: true },
        ]),
      },
    },
  },
  {
    key: 'attendances',
    label: 'Attendance',
    apiPath: '/attendances',
    permission: Permission.ATTENDANCE_READ,
    createPermission: Permission.ATTENDANCE_MARK,
    updatePermission: Permission.ATTENDANCE_MANAGE,
    deletePermission: Permission.ATTENDANCE_MANAGE,
    deletable: true,
    columns: [
      { header: 'Date', render: (row) => text(formatDate(firstOf(row, 'date'))) },
      personColumn('Student'),
      { header: 'Section', render: (row) => text(firstOf(row, 'section.name', 'sectionId')) },
      { header: 'Status', render: (row) => text(humanize(firstOf(row, 'status'))) },
    ],
    form: {
      create: {
        fields: [
          {
            name: 'studentId',
            label: 'Student',
            type: 'select',
            required: true,
            lookup: 'students',
          },
          {
            name: 'sectionId',
            label: 'Section',
            type: 'select',
            required: true,
            lookup: 'sections',
          },
          textField('date', 'Date', { type: 'date', required: true }),
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            required: true,
            options: ATTENDANCE_STATUS_OPTIONS,
          },
          textField('remark', 'Remark'),
        ],
        schema: createAttendanceSchema,
      },
      edit: {
        fields: [
          { name: 'status', label: 'Status', type: 'select', options: ATTENDANCE_STATUS_OPTIONS },
          textField('remark', 'Remark'),
        ],
        schema: updateAttendanceSchema,
      },
    },
  },
  {
    key: 'exams',
    label: 'Exams',
    apiPath: '/exams',
    permission: Permission.EXAM_READ,
    createPermission: Permission.EXAM_MANAGE,
    updatePermission: Permission.EXAM_MANAGE,
    deletePermission: Permission.EXAM_MANAGE,
    deletable: true,
    columns: [
      nameColumn('Exam'),
      { header: 'Type', render: (row) => text(humanize(firstOf(row, 'type', 'examType'))) },
      { header: 'Date', render: (row) => text(formatDate(firstOf(row, 'date', 'startDate'))) },
    ],
    form: {
      create: {
        fields: [
          {
            name: 'classLevelId',
            label: 'Class',
            type: 'select',
            required: true,
            lookup: 'classes',
          },
          {
            name: 'subjectId',
            label: 'Subject',
            type: 'select',
            required: true,
            lookup: 'subjects',
          },
          textField('name', 'Name', { required: true }),
          { name: 'examType', label: 'Exam type', type: 'select', options: EXAM_TYPE_OPTIONS },
          { name: 'maxMarks', label: 'Max marks', type: 'number', min: 0 },
          { name: 'passingMarks', label: 'Passing marks', type: 'number', min: 0 },
          textField('startDate', 'Start date', { type: 'date' }),
          textField('endDate', 'End date', { type: 'date' }),
          {
            name: 'academicYearId',
            label: 'Academic year',
            type: 'select',
            lookup: 'academicYears',
          },
          { name: 'termId', label: 'Term', type: 'select', lookup: 'terms' },
        ],
        schema: createExamSchema,
      },
      edit: {
        fields: [
          textField('name', 'Name'),
          { name: 'examType', label: 'Exam type', type: 'select', options: EXAM_TYPE_OPTIONS },
          { name: 'maxMarks', label: 'Max marks', type: 'number', min: 0 },
          { name: 'passingMarks', label: 'Passing marks', type: 'number', min: 0 },
          textField('startDate', 'Start date', { type: 'date' }),
          textField('endDate', 'End date', { type: 'date' }),
        ],
        schema: updateExamSchema,
      },
    },
  },
  {
    key: 'exam-results',
    label: 'Exam Results',
    apiPath: '/exam-results',
    permission: Permission.RESULT_READ,
    createPermission: Permission.RESULT_MANAGE,
    updatePermission: Permission.RESULT_MANAGE,
    deletePermission: Permission.RESULT_MANAGE,
    deletable: true,
    columns: [
      personColumn('Student'),
      { header: 'Exam', render: (row) => text(firstOf(row, 'exam.name', 'examId')) },
      { header: 'Marks', render: (row) => text(firstOf(row, 'marksObtained', 'marks', 'score')) },
      { header: 'Grade', render: (row) => text(firstOf(row, 'grade')) },
    ],
    form: {
      create: {
        fields: [
          { name: 'examId', label: 'Exam', type: 'select', required: true, lookup: 'exams' },
          {
            name: 'subjectId',
            label: 'Subject',
            type: 'select',
            required: true,
            lookup: 'subjects',
          },
          {
            name: 'studentId',
            label: 'Student',
            type: 'select',
            required: true,
            lookup: 'students',
          },
          {
            name: 'marksObtained',
            label: 'Marks obtained',
            type: 'number',
            required: true,
            min: 0,
          },
          textField('grade', 'Grade'),
          textField('remarks', 'Remarks', { type: 'textarea' }),
        ],
        schema: createExamResultSchema,
      },
      edit: {
        fields: [
          { name: 'marksObtained', label: 'Marks obtained', type: 'number', min: 0 },
          textField('grade', 'Grade'),
          textField('remarks', 'Remarks', { type: 'textarea' }),
        ],
        schema: updateExamResultSchema,
      },
    },
  },
  {
    key: 'fee-categories',
    label: 'Fee Categories',
    apiPath: '/fees/categories',
    permission: Permission.FEE_READ,
    createPermission: Permission.FEE_MANAGE,
    updatePermission: Permission.FEE_MANAGE,
    deletePermission: Permission.FEE_MANAGE,
    deletable: true,
    columns: [
      nameColumn(),
      { header: 'Frequency', render: (row) => text(humanize(firstOf(row, 'frequency'))) },
      createdColumn,
    ],
    form: {
      create: {
        fields: [
          textField('name', 'Name', { required: true }),
          textField('description', 'Description', { type: 'textarea' }),
        ],
        schema: createFeeCategorySchema,
      },
      edit: {
        fields: [
          textField('name', 'Name'),
          textField('description', 'Description', { type: 'textarea' }),
        ],
        schema: updateFeeCategorySchema,
      },
    },
  },
  {
    key: 'fee-structures',
    label: 'Fee Structures',
    apiPath: '/fees/structures',
    permission: Permission.FEE_READ,
    createPermission: Permission.FEE_MANAGE,
    updatePermission: Permission.FEE_MANAGE,
    deletePermission: Permission.FEE_MANAGE,
    deletable: true,
    columns: [
      nameColumn(),
      { header: 'Amount', render: (row) => text(formatCurrency(firstOf(row, 'amount'))) },
      { header: 'Frequency', render: (row) => text(humanize(firstOf(row, 'frequency'))) },
    ],
    form: {
      create: {
        fields: [
          {
            name: 'classLevelId',
            label: 'Class',
            type: 'select',
            required: true,
            lookup: 'classes',
          },
          {
            name: 'feeCategoryId',
            label: 'Fee category',
            type: 'select',
            required: true,
            lookup: 'feeCategories',
          },
          { name: 'amount', label: 'Amount', type: 'number', required: true, min: 0, step: '0.01' },
          {
            name: 'frequency',
            label: 'Frequency',
            type: 'select',
            options: FEE_FREQUENCY_OPTIONS,
            defaultValue: 'ANNUAL',
          },
          { name: 'dueDay', label: 'Due day', type: 'number', min: 1, max: 31 },
          {
            name: 'academicYearId',
            label: 'Academic year',
            type: 'select',
            lookup: 'academicYears',
          },
        ],
        schema: createFeeStructureSchema,
      },
      edit: {
        fields: [
          { name: 'amount', label: 'Amount', type: 'number', min: 0, step: '0.01' },
          { name: 'frequency', label: 'Frequency', type: 'select', options: FEE_FREQUENCY_OPTIONS },
          { name: 'dueDay', label: 'Due day', type: 'number', min: 1, max: 31 },
        ],
        schema: updateFeeStructureSchema,
      },
    },
  },
  {
    key: 'invoices',
    label: 'Invoices',
    apiPath: '/invoices',
    permission: Permission.INVOICE_READ,
    searchable: true,
    createPermission: Permission.INVOICE_MANAGE,
    updatePermission: Permission.INVOICE_MANAGE,
    deletePermission: Permission.INVOICE_MANAGE,
    deletable: true,
    createHref: '/invoices/new',
    columns: [
      { header: 'Invoice No', render: (row) => text(firstOf(row, 'invoiceNo')) },
      personColumn('Student'),
      { header: 'Total', render: (row) => text(formatCurrency(firstOf(row, 'total'))) },
      { header: 'Balance', render: (row) => text(formatCurrency(firstOf(row, 'balance'))) },
      { header: 'Status', render: (row) => text(humanize(firstOf(row, 'status'))) },
    ],
    form: {
      edit: {
        fields: [
          textField('dueDate', 'Due date', { type: 'date' }),
          { name: 'discount', label: 'Discount', type: 'number', min: 0, step: '0.01' },
          { name: 'status', label: 'Status', type: 'select', options: INVOICE_STATUS_OPTIONS },
          textField('notes', 'Notes', { type: 'textarea' }),
        ],
        schema: updateInvoiceSchema,
      },
    },
  },
  {
    key: 'payments',
    label: 'Payments',
    apiPath: '/payments',
    permission: Permission.PAYMENT_READ,
    createPermission: Permission.PAYMENT_MANAGE,
    updatePermission: Permission.PAYMENT_MANAGE,
    deletePermission: Permission.PAYMENT_MANAGE,
    deletable: true,
    createHref: '/payments/new',
    columns: [
      { header: 'Amount', render: (row) => text(formatCurrency(firstOf(row, 'amount'))) },
      { header: 'Method', render: (row) => text(humanize(firstOf(row, 'method'))) },
      { header: 'Invoice', render: (row) => text(firstOf(row, 'invoice.invoiceNo', 'invoiceId')) },
      { header: 'Paid at', render: (row) => text(formatDateTime(firstOf(row, 'paidAt'))) },
    ],
    form: {
      edit: {
        fields: [
          { name: 'amount', label: 'Amount', type: 'number', min: 0.01, step: '0.01' },
          { name: 'method', label: 'Method', type: 'select', options: PAYMENT_METHOD_OPTIONS },
          textField('transactionRef', 'Transaction ref'),
          textField('notes', 'Notes', { type: 'textarea' }),
        ],
        schema: updatePaymentSchema,
      },
    },
  },
  {
    key: 'books',
    label: 'Books',
    apiPath: '/books',
    permission: Permission.LIBRARY_READ,
    searchable: true,
    createPermission: Permission.LIBRARY_MANAGE,
    updatePermission: Permission.LIBRARY_MANAGE,
    deletePermission: Permission.LIBRARY_MANAGE,
    deletable: true,
    columns: [
      { header: 'Title', render: (row) => text(firstOf(row, 'title')) },
      { header: 'Author', render: (row) => text(firstOf(row, 'author')) },
      { header: 'ISBN', render: (row) => text(firstOf(row, 'isbn')) },
      { header: 'Copies', render: (row) => text(firstOf(row, 'availableCopies', 'totalCopies')) },
    ],
    form: {
      create: {
        fields: [
          textField('title', 'Title', { required: true }),
          textField('author', 'Author', { required: true }),
          textField('isbn', 'ISBN'),
          textField('category', 'Category'),
          textField('publisher', 'Publisher'),
          { name: 'publishedYear', label: 'Published year', type: 'number' },
          { name: 'totalCopies', label: 'Total copies', type: 'number', min: 0, defaultValue: 1 },
          textField('shelf', 'Shelf'),
        ],
        schema: createBookSchema,
      },
      edit: {
        fields: [
          textField('title', 'Title'),
          textField('author', 'Author'),
          textField('isbn', 'ISBN'),
          textField('category', 'Category'),
          textField('publisher', 'Publisher'),
          { name: 'publishedYear', label: 'Published year', type: 'number' },
          { name: 'totalCopies', label: 'Total copies', type: 'number', min: 0 },
          { name: 'availableCopies', label: 'Available copies', type: 'number', min: 0 },
          textField('shelf', 'Shelf'),
        ],
        schema: updateBookSchema,
      },
    },
  },
  {
    key: 'book-loans',
    label: 'Book Loans',
    apiPath: '/book-loans',
    permission: Permission.LOAN_READ,
    createPermission: Permission.LOAN_MANAGE,
    updatePermission: Permission.LOAN_MANAGE,
    deletePermission: Permission.LOAN_MANAGE,
    deletable: true,
    columns: [
      { header: 'Book', render: (row) => text(firstOf(row, 'book.title', 'bookId')) },
      personColumn('Student'),
      { header: 'Status', render: (row) => text(humanize(firstOf(row, 'status'))) },
      { header: 'Due', render: (row) => text(formatDate(firstOf(row, 'dueAt', 'dueDate'))) },
    ],
    form: {
      create: {
        fields: [
          { name: 'bookId', label: 'Book', type: 'select', required: true, lookup: 'books' },
          { name: 'studentId', label: 'Student', type: 'select', lookup: 'students' },
          textField('dueAt', 'Due date', { type: 'date', required: true }),
        ],
        schema: createBookLoanSchema,
      },
      edit: {
        fields: [
          textField('returnedAt', 'Returned date', { type: 'date' }),
          { name: 'status', label: 'Status', type: 'select', options: LOAN_STATUS_OPTIONS },
          { name: 'fine', label: 'Fine', type: 'number', min: 0, step: '0.01' },
        ],
        schema: updateBookLoanSchema,
      },
    },
  },
  {
    key: 'vehicles',
    label: 'Vehicles',
    apiPath: '/vehicles',
    permission: Permission.TRANSPORT_READ,
    createPermission: Permission.TRANSPORT_MANAGE,
    updatePermission: Permission.TRANSPORT_MANAGE,
    deletePermission: Permission.TRANSPORT_MANAGE,
    deletable: true,
    columns: [
      { header: 'Plate', render: (row) => text(firstOf(row, 'plateNumber', 'registrationNo')) },
      { header: 'Model', render: (row) => text(firstOf(row, 'model', 'make')) },
      { header: 'Capacity', render: (row) => text(firstOf(row, 'capacity')) },
      { header: 'Status', render: (row) => text(humanize(firstOf(row, 'status'))) },
    ],
    form: {
      create: {
        fields: [
          textField('plateNumber', 'Plate number', { required: true }),
          { name: 'capacity', label: 'Capacity', type: 'number', required: true, min: 1 },
          textField('model', 'Model'),
          textField('driverName', 'Driver name'),
          textField('driverPhone', 'Driver phone'),
          textField('insuranceExpiry', 'Insurance expiry', { type: 'date' }),
        ],
        schema: createVehicleSchema,
      },
      edit: {
        fields: [
          textField('model', 'Model'),
          { name: 'capacity', label: 'Capacity', type: 'number', min: 1 },
          textField('driverName', 'Driver name'),
          textField('driverPhone', 'Driver phone'),
          { name: 'status', label: 'Status', type: 'select', options: VEHICLE_STATUS_OPTIONS },
          textField('insuranceExpiry', 'Insurance expiry', { type: 'date' }),
        ],
        schema: updateVehicleSchema,
      },
    },
  },
  {
    key: 'transport-routes',
    label: 'Routes',
    apiPath: '/transport-routes',
    permission: Permission.TRANSPORT_READ,
    createPermission: Permission.TRANSPORT_MANAGE,
    updatePermission: Permission.TRANSPORT_MANAGE,
    deletePermission: Permission.TRANSPORT_MANAGE,
    deletable: true,
    columns: [
      nameColumn('Route'),
      { header: 'Code', render: (row) => text(firstOf(row, 'code')) },
      { header: 'Fare', render: (row) => text(formatCurrency(firstOf(row, 'fare'))) },
      { header: 'Description', render: (row) => text(firstOf(row, 'description')) },
    ],
    form: {
      create: {
        fields: [
          textField('name', 'Name', { required: true }),
          textField('code', 'Code', { required: true }),
          { name: 'fare', label: 'Fare', type: 'number', min: 0, step: '0.01', defaultValue: 0 },
          textField('description', 'Description', { type: 'textarea' }),
          { name: 'vehicleId', label: 'Vehicle', type: 'select', lookup: 'vehicles' },
        ],
        schema: createTransportRouteSchema,
      },
      edit: {
        fields: [
          textField('name', 'Name'),
          textField('description', 'Description', { type: 'textarea' }),
          { name: 'fare', label: 'Fare', type: 'number', min: 0, step: '0.01' },
          { name: 'vehicleId', label: 'Vehicle', type: 'select', lookup: 'vehicles' },
        ],
        schema: updateTransportRouteSchema,
      },
    },
  },
  {
    key: 'route-stops',
    label: 'Route Stops',
    apiPath: '/route-stops',
    permission: Permission.TRANSPORT_READ,
    createPermission: Permission.TRANSPORT_MANAGE,
    updatePermission: Permission.TRANSPORT_MANAGE,
    deletePermission: Permission.TRANSPORT_MANAGE,
    deletable: true,
    columns: [
      { header: 'Route', render: (row) => text(firstOf(row, 'route.name', 'routeId')) },
      nameColumn('Stop'),
      { header: 'Sequence', render: (row) => text(firstOf(row, 'sequence')) },
      { header: 'Pickup', render: (row) => text(firstOf(row, 'pickupTime')) },
      { header: 'Drop', render: (row) => text(firstOf(row, 'dropTime')) },
    ],
    form: {
      create: {
        fields: [
          { name: 'routeId', label: 'Route', type: 'select', required: true, lookup: 'routes' },
          textField('name', 'Name', { required: true }),
          { name: 'sequence', label: 'Sequence', type: 'number', required: true, min: 1 },
          textField('pickupTime', 'Pickup time'),
          textField('dropTime', 'Drop time'),
          { name: 'latitude', label: 'Latitude', type: 'number', step: 'any' },
          { name: 'longitude', label: 'Longitude', type: 'number', step: 'any' },
        ],
        schema: createRouteStopSchema,
      },
      edit: {
        fields: [
          textField('name', 'Name'),
          { name: 'sequence', label: 'Sequence', type: 'number', min: 1 },
          textField('pickupTime', 'Pickup time'),
          textField('dropTime', 'Drop time'),
          { name: 'latitude', label: 'Latitude', type: 'number', step: 'any' },
          { name: 'longitude', label: 'Longitude', type: 'number', step: 'any' },
        ],
        schema: updateRouteStopSchema,
      },
    },
  },
  {
    key: 'transport-subscriptions',
    label: 'Subscriptions',
    apiPath: '/transport-subscriptions',
    permission: Permission.TRANSPORT_READ,
    createPermission: Permission.TRANSPORT_MANAGE,
    updatePermission: Permission.TRANSPORT_MANAGE,
    deletePermission: Permission.TRANSPORT_MANAGE,
    deletable: true,
    columns: [
      personColumn('Student'),
      {
        header: 'Route',
        render: (row) => text(firstOf(row, 'route.name', 'transportRoute.name', 'routeId')),
      },
      { header: 'Status', render: (row) => text(humanize(firstOf(row, 'status'))) },
      { header: 'Start', render: (row) => text(formatDate(firstOf(row, 'startDate'))) },
    ],
    form: {
      create: {
        fields: [
          {
            name: 'studentId',
            label: 'Student',
            type: 'select',
            required: true,
            lookup: 'students',
          },
          { name: 'routeId', label: 'Route', type: 'select', required: true, lookup: 'routes' },
          { name: 'stopId', label: 'Stop', type: 'select', lookup: 'routeStops' },
          textField('startDate', 'Start date', { type: 'date', required: true }),
          textField('endDate', 'End date', { type: 'date' }),
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: TRANSPORT_STATUS_OPTIONS,
            defaultValue: 'ACTIVE',
          },
          {
            name: 'academicYearId',
            label: 'Academic year',
            type: 'select',
            lookup: 'academicYears',
          },
        ],
        schema: createTransportSubscriptionSchema,
      },
      edit: {
        fields: [
          { name: 'stopId', label: 'Stop', type: 'select', lookup: 'routeStops' },
          textField('endDate', 'End date', { type: 'date' }),
          { name: 'status', label: 'Status', type: 'select', options: TRANSPORT_STATUS_OPTIONS },
        ],
        schema: updateTransportSubscriptionSchema,
      },
    },
  },
  {
    key: 'notices',
    label: 'Notices',
    apiPath: '/notices',
    permission: Permission.NOTICE_READ,
    searchable: true,
    createPermission: Permission.NOTICE_MANAGE,
    updatePermission: Permission.NOTICE_MANAGE,
    deletePermission: Permission.NOTICE_MANAGE,
    deletable: true,
    columns: [
      { header: 'Title', render: (row) => text(firstOf(row, 'title')) },
      { header: 'Pinned', render: (row) => (row.isPinned ? 'Yes' : 'No') },
      {
        header: 'Published',
        render: (row) => text(formatDateTime(firstOf(row, 'publishedAt', 'createdAt'))),
      },
      { header: 'Expires', render: (row) => text(formatDate(firstOf(row, 'expiresAt'))) },
    ],
    form: {
      create: {
        fields: [
          textField('title', 'Title', { required: true }),
          textField('body', 'Body', { type: 'textarea', required: true }),
          { name: 'isPinned', label: 'Pin this notice', type: 'checkbox' },
          textField('expiresAt', 'Expires at', { type: 'date' }),
        ],
        schema: createNoticeSchema,
      },
      edit: {
        fields: [
          textField('title', 'Title'),
          textField('body', 'Body', { type: 'textarea' }),
          { name: 'isPinned', label: 'Pin this notice', type: 'checkbox' },
          textField('expiresAt', 'Expires at', { type: 'date' }),
        ],
        schema: updateNoticeSchema,
      },
    },
  },
  {
    key: 'audit-logs',
    label: 'Audit Logs',
    apiPath: '/audit-logs',
    permission: Permission.AUDIT_READ,
    columns: [
      { header: 'Action', render: (row) => text(firstOf(row, 'action')) },
      { header: 'Entity', render: (row) => text(firstOf(row, 'entity')) },
      { header: 'Entity ID', render: (row) => text(shortId(firstOf(row, 'entityId'))) },
      { header: 'When', render: (row) => text(formatDateTime(firstOf(row, 'createdAt'))) },
    ],
  },
  {
    key: 'schools',
    label: 'Schools',
    apiPath: '/schools',
    permission: Permission.SCHOOL_READ,
    updatePermission: Permission.SCHOOL_UPDATE,
    columns: [
      nameColumn(),
      { header: 'Code', render: (row) => text(firstOf(row, 'code')) },
      { header: 'Currency', render: (row) => text(firstOf(row, 'currency')) },
      { header: 'Timezone', render: (row) => text(firstOf(row, 'timezone')) },
    ],
    form: {
      edit: {
        fields: [
          textField('name', 'Name'),
          textField('code', 'Code'),
          textField('email', 'Email', { type: 'email' }),
          textField('phone', 'Phone'),
          textField('address', 'Address', { type: 'textarea' }),
          textField('timezone', 'Timezone'),
          textField('currency', 'Currency code', { help: '3-letter ISO code, e.g. USD' }),
          { name: 'isActive', label: 'Active', type: 'checkbox' },
        ],
        schema: updateSchoolSchema,
      },
    },
  },
];

export function resourceByKey(key: string): ResourceConfig | undefined {
  return RESOURCES.find((resource) => resource.key === key);
}
