import { ROLE_LABELS } from '@smartschool/shared';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime } from '../lib/format';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setSuccess('Password updated. Please sign in again.');
      setCurrentPassword('');
      setNewPassword('');
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to change password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <PageHeader title="Profile" subtitle="Your account details" />

      <div className="dashboard">
        <section className="panel">
          <h2 className="panel__title">Account</h2>
          <dl className="details">
            <div className="details__row">
              <dt>Name</dt>
              <dd>
                {user.firstName} {user.lastName}
              </dd>
            </div>
            <div className="details__row">
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="details__row">
              <dt>Role</dt>
              <dd>{ROLE_LABELS[user.role]}</dd>
            </div>
            <div className="details__row">
              <dt>School</dt>
              <dd>{user.schoolId ?? '—'}</dd>
            </div>
            <div className="details__row">
              <dt>Last login</dt>
              <dd>{formatDateTime(user.lastLoginAt) || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <h2 className="panel__title">Change password</h2>
          {error ? <div className="alert alert--error">{error}</div> : null}
          {success ? <div className="alert alert--success">{success}</div> : null}
          <form className="form" onSubmit={onSubmit}>
            <label className="field">
              <span className="field__label">Current password</span>
              <input
                className="field__input"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">New password</span>
              <input
                className="field__input"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
