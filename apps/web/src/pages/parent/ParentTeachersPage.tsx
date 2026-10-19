import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { EmptyState, ErrorState, PageHeader, SkeletonPanels } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { initials } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { ForbiddenPage } from '../ForbiddenPage';

interface ChildTeacher {
  id: string;
  teacherId: string;
  name: string | null;
  photoUrl: string | null;
  subject: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
}

interface ChildRow {
  id: string;
  name: string | null;
  className: string | null;
  sectionName: string | null;
  teachers: ChildTeacher[];
}

interface ParentOverview {
  children: ChildRow[];
}

function labelOf(child: ChildRow): string {
  return (
    [child.name, child.className, child.sectionName].filter(Boolean).join(' · ') ||
    'Student'
  );
}

function teacherInitials(name: string | null): string {
  if (!name) return '?';
  const [first, ...rest] = name.split(' ');
  return initials(first, rest.join(' '));
}

/**
 * Compose dialog for a parent to start a conversation with one of their
 * child's teachers. Posts to `/conversations/teachers`, which re-derives the
 * child → section → teacher relationship on the server.
 */
function MessageTeacherDialog({
  studentId,
  teacher,
  onClose,
}: {
  studentId: string;
  teacher: ChildTeacher;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      await api.post('/conversations/teachers', {
        studentId,
        teacherId: teacher.teacherId,
        subject,
        body,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send your message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title={`Message ${teacher.name ?? 'teacher'}`} onClose={onClose}>
      {sent ? (
        <div className="dashboard">
          <div className="alert alert--success" role="status">
            Your message was sent. You can continue the conversation under Messages.
          </div>
          <div className="form__actions">
            <a className="btn btn--primary" href="/messages">
              Go to Messages
            </a>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <form className="form" onSubmit={onSubmit} noValidate>
          {error ? (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          ) : null}
          <label className="field">
            <span className="field__label">Subject</span>
            <input
              className="field__input"
              type="text"
              required
              maxLength={150}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Message</span>
            <textarea
              className="field__input"
              rows={4}
              required
              maxLength={5000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <div className="form__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={sending}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={sending}>
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function ParentTeachersPage() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState('');
  const [messageFor, setMessageFor] = useState<ChildTeacher | null>(null);

  const state = useAsync<ParentOverview>(() => api.get('/parents/me/children'), []);

  if (!user) return null;
  if (user.role !== 'PARENT') return <ForbiddenPage />;

  const children = state.data?.children ?? [];
  const child = children.find((item) => item.id === selectedId) ?? children[0] ?? null;

  return (
    <div className="page">
      <PageHeader
        title="Teachers"
        subtitle="The teachers assigned to your child's class"
        icon="teacher"
      />

      <section className="panel">
        {state.loading ? (
          <SkeletonPanels count={1} />
        ) : state.forbidden ? (
          <ForbiddenPage />
        ) : state.error ? (
          <ErrorState message={state.error} onRetry={state.reload} />
        ) : children.length === 0 || !child ? (
          <EmptyState
            icon="teacher"
            message="No children are linked to your account yet."
            hint="Please contact the school office to link your children."
          />
        ) : (
          <>
            {children.length > 1 ? (
              <label className="field" style={{ maxWidth: 360, marginBottom: 16 }}>
                <span className="field__label">Child</span>
                <select
                  className="field__input"
                  value={child.id}
                  onChange={(event) => setSelectedId(event.target.value)}
                >
                  {children.map((item) => (
                    <option key={item.id} value={item.id}>
                      {labelOf(item)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {child.teachers.length === 0 ? (
              <EmptyState icon="teacher" message="No teachers have been assigned yet." />
            ) : (
              <ul className="teacher-list">
                {child.teachers.map((item) => (
                  <li className="teacher-card" key={item.id}>
                    {item.photoUrl ? (
                      <img className="photo" src={item.photoUrl} alt="" />
                    ) : (
                      <span className="photo photo--empty">{teacherInitials(item.name)}</span>
                    )}
                    <div className="teacher-card__info">
                      <strong>{item.name ?? 'Teacher'}</strong>
                      <span>{item.subject}</span>
                      {item.contact ? <span>{item.contact}</span> : null}
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ marginTop: 6 }}
                        onClick={() => setMessageFor(item)}
                      >
                        Message
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {child && messageFor ? (
        <MessageTeacherDialog
          studentId={child.id}
          teacher={messageFor}
          onClose={() => setMessageFor(null)}
        />
      ) : null}
    </div>
  );
}
