import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError, type LoginPortal } from '../lib/api';
import { useAuth } from '../lib/auth';
import { resolveLoginTarget } from '../lib/routing';

interface PortalLoginProps {
  portal: LoginPortal;
  title: string;
  subtitle: string;
  badge: string;
}

function PortalLogin({ portal, title, subtitle, badge }: PortalLoginProps) {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={resolveLoginTarget(user.role, from)} replace />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const session = await login(email.trim(), password, portal);
      navigate(resolveLoginTarget(session.role, from), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={onSubmit}>
        <div className="brand brand--stacked">
          <span className="brand__mark">SS</span>
          <span className="brand__text">SmartSchool</span>
        </div>
        <h1 className="auth__title">{title}</h1>
        <p className="auth__subtitle">{subtitle}</p>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <label className="field">
          <span className="field__label">Email</span>
          <input
            className="field__input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@school.edu"
          />
        </label>

        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="field__input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </label>

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="auth__subtitle">{badge}</p>
        <div className="auth__links">
          <Link to="/login">Admin</Link>
          <Link to="/login/teacher">Teacher</Link>
          <Link to="/login/parent">Parent</Link>
        </div>
      </form>
    </div>
  );
}

/** Platform / administrator sign-in. */
export function LoginPage() {
  return (
    <PortalLogin
      portal="admin"
      title="Admin sign in"
      subtitle="Use your administrator account to continue."
      badge="Administrators manage teachers, parents and school data."
    />
  );
}

/** Teacher portal sign-in. */
export function TeacherLoginPage() {
  return (
    <PortalLogin
      portal="teacher"
      title="Teacher sign in"
      subtitle="Sign in with the email and password issued by your admin."
      badge="Teacher accounts are created by an administrator."
    />
  );
}

/** Parent portal sign-in. */
export function ParentLoginPage() {
  return (
    <PortalLogin
      portal="parent"
      title="Parent sign in"
      subtitle="Sign in to follow your children's attendance, marks and results."
      badge="Parent accounts are created by an administrator."
    />
  );
}
