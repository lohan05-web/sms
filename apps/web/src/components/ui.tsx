import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
  hint,
  illustration,
}: {
  message: string;
  icon?: IconName;
  /** Optional secondary line giving the user a next step. */
  hint?: string;
  /** Optional artwork shown in place of the icon bubble. */
  illustration?: ReactNode;
}) {
  return (
    <div className="state state--empty">
      {illustration ? (
        <span className="state__art">{illustration}</span>
      ) : (
        <span className="state__icon">
          <Icon name={icon} size={24} />
        </span>
      )}
      <p>{message}</p>
      {hint ? <span className="state__hint">{hint}</span> : null}
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
      <span className="stat-card__value">
        <CountUp value={value} />
      </span>
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

/* --------------------------------------------------------------------------
   Motion primitives
   -------------------------------------------------------------------------- */

const NUMERIC_RE = /^(-?[\d,]+(?:\.\d+)?)(%)?$/;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function parseNumeric(value: number | string): { target: number; suffix: string } | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { target: value, suffix: '' } : null;
  }
  const match = value.match(NUMERIC_RE);
  if (!match) return null;
  const parsed = Number(match[1]?.replace(/,/g, ''));
  if (!Number.isFinite(parsed)) return null;
  return { target: parsed, suffix: match[2] ?? '' };
}

/**
 * Counts a numeric value up from zero when it scrolls into view. Non-numeric
 * values are rendered untouched, and reduced-motion users see the final value
 * immediately.
 */
export function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: ReactNode;
  duration?: number;
  className?: string;
}) {
  const parsed = parseNumeric(
    typeof value === 'number' || typeof value === 'string' ? value : Number.NaN,
  );
  const target = parsed?.target ?? null;
  const suffix = parsed?.suffix ?? '';
  const decimals = target !== null && !Number.isInteger(target) ? 1 : 0;

  const [display, setDisplay] = useState<number>(() =>
    target === null || prefersReducedMotion() ? (target ?? 0) : 0,
  );
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (target === null) return;
    if (prefersReducedMotion()) {
      setDisplay(target);
      return;
    }

    let frame = 0;
    let cancelled = false;
    const animate = () => {
      const start = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(target * eased);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      animate();
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animate();
              observer.disconnect();
            }
          });
        },
        { threshold: 0.15 },
      );
      observer.observe(node);
      return () => {
        cancelled = true;
        observer.disconnect();
        cancelAnimationFrame(frame);
      };
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [target, duration]);

  if (target === null) return <>{value}</>;

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/** Shimmering placeholder block used while content loads. */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 8,
  className,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`skeleton${className ? ` ${className}` : ''}`}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/** A grid of skeleton stat cards for dashboard loading states. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="stat-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}

/** A stack of skeleton panels for page-level loading states. */
export function SkeletonPanels({ count = 3 }: { count?: number }) {
  return (
    <div className="dashboard" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="skeleton skeleton-panel" />
      ))}
    </div>
  );
}

/** A stack of skeleton rows for table/listing loading states. */
export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton-table" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="skeleton skeleton-row" />
      ))}
    </div>
  );
}
