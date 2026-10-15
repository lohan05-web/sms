import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="spinner__dot" />
      {label ? <span className="spinner__label">{label}</span> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__icon">
        <Icon name="alert" size={24} />
      </span>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          <Icon name="refresh" size={16} />
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  message,
  icon = 'inbox',
}: {
  message: string;
  icon?: IconName;
}) {
  return (
    <div className="state state--empty">
      <span className="state__icon">
        <Icon name={icon} size={24} />
      </span>
      <p>{message}</p>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: IconName;
}) {
  return (
    <header className="page-header">
      <div className="page-header__heading">
        {icon ? (
          <span className="page-header__icon">
            <Icon name={icon} size={22} />
          </span>
        ) : null}
        <div>
          <h1 className="page-header__title">{title}</h1>
          {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}

export type StatTone = 'primary' | 'success' | 'warning' | 'danger' | 'info';

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: IconName;
  tone?: StatTone;
}) {
  return (
    <div className={`stat-card${tone !== 'primary' ? ` stat-card--${tone}` : ''}`}>
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {icon ? (
          <span className="stat-card__icon">
            <Icon name={icon} size={17} />
          </span>
        ) : null}
      </div>
      <span className="stat-card__value">{value}</span>
      {hint ? <span className="stat-card__hint">{hint}</span> : null}
    </div>
  );
}

export function formatStatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}
