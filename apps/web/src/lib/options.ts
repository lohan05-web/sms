import { useEffect, useState } from 'react';
import { api } from './api';

export interface Option {
  value: string;
  label: string;
}

export type LookupKind =
  | 'academicYears'
  | 'classes'
  | 'sections'
  | 'subjects'
  | 'students'
  | 'teachers'
  | 'books'
  | 'invoices'
  | 'terms'
  | 'feeCategories'
  | 'routes'
  | 'routeStops'
  | 'vehicles'
  | 'drivers'
  | 'users'
  | 'exams'
  | 'homework'
  | 'timetable'
  | 'syllabus'
  | 'homeworkSubmissions'
  | 'homeworkAttachments';

type Row = Record<string, unknown>;

interface LookupSource {
  path: string;
  label: (row: Row) => string;
}

function str(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function nested(row: Row, outer: string, inner: string): unknown {
  const obj = row[outer];
  if (obj && typeof obj === 'object') return (obj as Row)[inner];
  return undefined;
}

function person(row: Row, prefix = ''): string {
  if (prefix) {
    const obj = row[prefix];
    if (obj && typeof obj === 'object') {
      return `${str((obj as Row).firstName)} ${str((obj as Row).lastName)}`.trim();
    }
    return '';
  }
  return `${str(row.firstName)} ${str(row.lastName)}`.trim();
}

const SOURCES: Record<LookupKind, LookupSource> = {
  academicYears: { path: '/academic-years', label: (row) => str(row.name) },
  classes: { path: '/classes', label: (row) => str(row.name) },
  sections: {
    path: '/sections',
    label: (row) => {
      const cls = str(nested(row, 'classLevel', 'name'));
      const name = str(row.name);
      return cls ? `${cls} · ${name}` : name;
    },
  },
  subjects: { path: '/subjects', label: (row) => str(row.name) },
  students: {
    path: '/students',
    label: (row) => {
      const name = person(row, 'user') || person(row);
      const admission = str(row.admissionNo);
      if (name && admission) return `${name} (${admission})`;
      return name || admission;
    },
  },
  teachers: {
    path: '/teachers',
    label: (row) => person(row, 'user') || person(row) || str(row.employeeNo),
  },
  books: {
    path: '/books',
    label: (row) => {
      const title = str(row.title);
      const author = str(row.author);
      return author ? `${title} — ${author}` : title;
    },
  },
  invoices: {
    path: '/invoices',
    label: (row) => {
      const no = str(row.invoiceNo);
      const student = person(row, 'student');
      return student ? `${no} · ${student}` : no;
    },
  },
  terms: {
    path: '/terms',
    label: (row) => {
      const name = str(row.name);
      const year = str(nested(row, 'academicYear', 'name'));
      return year ? `${name} (${year})` : name;
    },
  },
  feeCategories: { path: '/fees/categories', label: (row) => str(row.name) },
  routes: {
    path: '/transport-routes',
    label: (row) => {
      const name = str(row.name);
      const code = str(row.routeCode) || str(row.code);
      return code ? `${name} (${code})` : name;
    },
  },
  routeStops: {
    path: '/route-stops',
    label: (row) => {
      const name = str(row.name);
      const route = str(nested(row, 'route', 'name'));
      return route ? `${route} · ${name}` : name;
    },
  },
  vehicles: {
    path: '/vehicles',
    label: (row) => {
      const plate = str(row.plateNumber);
      const code = str(row.vehicleCode);
      return code ? `${plate} (${code})` : plate;
    },
  },
  drivers: {
    path: '/drivers',
    label: (row) => {
      const name = str(row.name);
      const code = str(row.driverCode);
      return code ? `${name} (${code})` : name;
    },
  },
  users: {
    path: '/users',
    label: (row) => {
      const name = person(row);
      const email = str(row.email);
      if (name && email) return `${name} (${email})`;
      return name || email;
    },
  },
  exams: {
    path: '/exams',
    label: (row) => {
      const name = str(row.name);
      const subject = str(nested(row, 'subject', 'name'));
      return subject ? `${name} · ${subject}` : name;
    },
  },
  homework: {
    path: '/homework',
    label: (row) => str(row.title),
  },
  timetable: {
    path: '/timetable',
    label: (row) => {
      const subject = str(nested(row, 'subject', 'name'));
      const section = str(nested(row, 'section', 'name'));
      const cls = str(nested(row, 'section', 'classLevel.name'));
      const prefix = [cls, section].filter(Boolean).join(' · ');
      return prefix ? `${prefix}: ${subject}` : subject;
    },
  },
  syllabus: {
    path: '/syllabus',
    label: (row) => str(row.title),
  },
  homeworkSubmissions: {
    path: '/homework-submissions',
    label: (row) => {
      const student = person(row, 'student');
      const hw = str(nested(row, 'homework', 'title'));
      return hw && student ? `${hw} — ${student}` : hw || student;
    },
  },
  homeworkAttachments: {
    path: '/homework-attachments',
    label: (row) => str(row.name),
  },
};

const cache = new Map<LookupKind, Promise<Option[]>>();

export function loadOptions(kind: LookupKind): Promise<Option[]> {
  const cached = cache.get(kind);
  if (cached) return cached;
  const source = SOURCES[kind];
  const promise = api
    .list<Row>(source.path, { page: 1, limit: 100 })
    .then(({ items }) =>
      items
        .map((row) => ({ value: str(row.id), label: source.label(row) || str(row.id) }))
        .filter((option) => option.value !== ''),
    )
    .catch(() => [] as Option[]);
  cache.set(kind, promise);
  return promise;
}

/**
 * Drop cached lookup results so records created or renamed elsewhere (for
 * example a brand new section) show up in dropdowns the next time they open.
 */
export function clearLookupCache(): void {
  cache.clear();
}

export function useLookups(kinds: readonly LookupKind[]): {
  options: Partial<Record<LookupKind, Option[]>>;
  loading: boolean;
} {
  const key = [...kinds].sort().join('|');
  const [options, setOptions] = useState<Partial<Record<LookupKind, Option[]>>>({});
  const [loading, setLoading] = useState(kinds.length > 0);

  useEffect(() => {
    const list = key ? (key.split('|') as LookupKind[]) : [];
    if (list.length === 0) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all(list.map(async (kind) => [kind, await loadOptions(kind)] as const))
      .then((entries) => {
        if (!active) return;
        const next: Partial<Record<LookupKind, Option[]>> = {};
        for (const [kind, opts] of entries) next[kind] = opts;
        setOptions(next);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key]);

  return { options, loading };
}
