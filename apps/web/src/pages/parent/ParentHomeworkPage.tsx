import { EmptyState } from '../../components/ui';
import { formatDate, humanize } from '../../lib/format';
import { ParentChildPage } from './ParentChildPage';

interface HomeworkAttachment {
  id: string;
  name: string;
  url: string;
}

interface HomeworkSubmission {
  status: string;
  submittedAt: string | null;
  remarks: string | null;
}

interface ChildHomework {
  id: string;
  title: string;
  description: string | null;
  materials: string | null;
  assignedDate: string;
  dueDate: string;
  subject?: { id?: string; name?: string | null } | null;
  teacher?: { id?: string; name?: string | null } | null;
  attachments: HomeworkAttachment[];
  submission: HomeworkSubmission | null;
}

const SUBMISSION_CLASS: Record<string, string> = {
  PENDING: 'badge badge--warning',
  SUBMITTED: 'badge badge--info',
  LATE: 'badge badge--danger',
  GRADED: 'badge badge--success',
};

export function ParentHomeworkPage() {
  return (
    <ParentChildPage<ChildHomework[]>
      title="Homework"
      subtitle="Assignments set for your child's section"
      endpoint={(studentId) => `/parents/me/children/${studentId}/homework`}
      emptyMessage="No homework has been assigned yet."
      isEmpty={(data) => data.length === 0}
      render={(data) =>
        data.length === 0 ? (
          <EmptyState message="No homework has been assigned yet." />
        ) : (
          <div className="dashboard">
            {data.map((item) => (
              <div className="panel" key={item.id}>
                <div className="panel__header">
                  <h3 className="panel__title">{item.title}</h3>
                  <span
                    className={
                      item.submission
                        ? (SUBMISSION_CLASS[item.submission.status] ?? 'badge badge--default')
                        : 'badge badge--default'
                    }
                  >
                    {item.submission ? humanize(item.submission.status) : 'Not submitted'}
                  </span>
                </div>
                <p className="muted">
                  {[item.subject?.name, item.teacher?.name].filter(Boolean).join(' · ') ||
                    'No subject'}
                </p>
                <p className="muted">
                  Assigned {formatDate(item.assignedDate)} · Due {formatDate(item.dueDate)}
                </p>
                {item.description ? <p>{item.description}</p> : null}
                {item.materials ? <p className="muted">{item.materials}</p> : null}
                {item.attachments.length > 0 ? (
                  <ul className="muted">
                    {item.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        <a href={attachment.url} target="_blank" rel="noreferrer">
                          {attachment.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )
      }
    />
  );
}
