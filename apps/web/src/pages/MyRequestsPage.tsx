import { SERVICE_REQUEST_TYPES } from '@smartschool/shared';
import { useState, type FormEvent } from 'react';
import { ErrorState, PageHeader, Spinner } from '../components/ui';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, humanize } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { ForbiddenPage } from './ForbiddenPage';

interface RequestItem {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  response: string | null;
  resolvedAt: string | null;
  createdAt: string;
  student: { id: string; admissionNo: string; user: { firstName: string; lastName: string } | null } | null;
}

interface Child {
  id: string;
  name: string | null;
  className: string | null;
  sectionName: string | null;
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'badge badge--warning',
  APPROVED: 'badge badge--success',
  COMPLETED: 'badge badge--success',
  REJECTED: 'badge badge--danger',
  CANCELLED: 'badge badge--default',
};

export function MyRequestsPage() {
  const { user } = useAuth();
  const [type, setType] = useState('BONAFIDE_CERTIFICATE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isParent = user?.role === 'PARENT';

  const state = useAsync<{ requests: RequestItem[]; children: Child[] }>(async () => {
    const requests = await api.get<RequestItem[]>('/service-requests/me');
    const children = isParent
      ? (await api.get<{ children: Child[] }>('/parents/me/children')).children
      : [];
    return { requests, children };
  }, [isParent]);

  if (!user) return null;
  if (user.role !== 'PARENT' && user.role !== 'STUDENT') return <ForbiddenPage />;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/service-requests/me', {
        type,
        title,
        description: description || undefined,
        studentId: studentId || undefined,
      });
      setTitle('');
      setDescription('');
      setStudentId('');
      state.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit your request.');
    } finally {
      setSubmitting(false);
    }
  };

  const childLabel = (child: Child) =>
    [child.name, child.className, child.sectionName].filter(Boolean).join(' · ') || child.id;

  return (
    <div className="page">
      <PageHeader title="My Requests" subtitle="Raise and track certificate & service requests" />

      <div className="dashboard">
        <section className="panel">
          <h2 className="panel__title">New request</h2>
          {error ? <div className="alert alert--error">{error}</div> : null}
          <form className="form" onSubmit={onSubmit}>
            <label className="field">
              <span className="field__label">Type</span>
              <select
                className="field__input"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {SERVICE_REQUEST_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                ))}
              </select>
            </label>
            {isParent && (state.data?.children.length ?? 0) > 0 ? (
              <label className="field">
                <span className="field__label">For child (optional)</span>
                <select
                  className="field__input"
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                >
                  <option value="">Myself / general</option>
                  {state.data?.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {childLabel(child)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="field">
              <span className="field__label">Title</span>
              <input
                className="field__input"
                type="text"
                required
                maxLength={150}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Details</span>
              <textarea
                className="field__input"
                rows={3}
                maxLength={4000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2 className="panel__title">Your requests</h2>
          {state.loading ? (
            <Spinner label="Loading requests…" />
          ) : state.error ? (
            <ErrorState message={state.error} onRetry={state.reload} />
          ) : state.data && state.data.requests.length > 0 ? (
            <ul className="notifications">
              {state.data.requests.map((item) => (
                <li key={item.id} className="notification">
                  <div className="notification__main">
                    <div className="notification__head">
                      <span className={STATUS_CLASS[item.status] ?? 'badge badge--default'}>
                        {humanize(item.status)}
                      </span>
                      <span className="notification__time">{formatDate(item.createdAt)}</span>
                    </div>
                    <h3 className="notification__title">{item.title}</h3>
                    <p className="notification__body">
                      {humanize(item.type)}
                      {item.student?.user
                        ? ` · ${item.student.user.firstName} ${item.student.user.lastName}`
                        : ''}
                      {item.description ? ` — ${item.description}` : ''}
                    </p>
                    {item.response ? (
                      <p className="notification__body">Response: {item.response}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="state state--empty">You have not raised any requests yet.</div>
          )}
        </section>
      </div>
    </div>
  );
}
