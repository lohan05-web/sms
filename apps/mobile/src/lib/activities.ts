export interface HomeworkSummary {
  id: string;
  title: string;
  description?: string | null;
  materials?: string | null;
  assignedDate?: string | null;
  dueDate?: string | null;
  subject?: { id: string; name: string; code?: string | null } | null;
  teacher?: { id: string; name: string } | null;
  submission?: {
    status: string;
    submittedAt?: string | null;
    remarks?: string | null;
  } | null;
  attachments: Array<{ id: string; name: string; url: string }>;
}

export interface TimetableEntry {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  materials?: string | null;
  subject?: { id: string; name: string; code?: string | null } | null;
  teacher?: { id: string; name: string } | null;
}

export interface SyllabusUnit {
  id: string;
  title: string;
  description?: string | null;
  upcomingTopic?: string | null;
  orderIndex: number;
  status: string;
  completedAt?: string | null;
  subject?: { id: string; name: string; code?: string | null } | null;
}

export function submissionLabel(status?: string | null): string {
  if (!status) return 'Not submitted';
  return status.replace(/_/g, ' ').toLowerCase();
}

export function syllabusProgressLabel(completed: number, total: number): string {
  if (total === 0) return 'No syllabus units';
  return `${completed}/${total} completed`;
}

export function formatStatusLabel(status?: string | null): string {
  if (!status) return '—';
  return String(status).replace(/_/g, ' ').toLowerCase();
}

export function weekOrder(day: string): number {
  const map: Record<string, number> = {
    MONDAY: 0,
    TUESDAY: 1,
    WEDNESDAY: 2,
    THURSDAY: 3,
    FRIDAY: 4,
    SATURDAY: 5,
    SUNDAY: 6,
  };
  return map[day] ?? 99;
}
