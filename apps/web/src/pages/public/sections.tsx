import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';

/**
 * Shared building blocks for the public website.
 *
 * These are intentionally small and layout-agnostic: every page composes them
 * into its own arrangement so the seven pages feel related without looking like
 * the same template repeated. All styling lives in the public stylesheets.
 */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Section({
  id,
  tone,
  className,
  children,
}: {
  id?: string;
  tone?: 'paper' | 'tint';
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cx('pub-section', tone === 'tint' && 'pub-section--tint', className)}
    >
      <div className="pub-container">{children}</div>
    </section>
  );
}

export function PageHero({
  eyebrow,
  title,
  lead,
  children,
  media,
}: {
  eyebrow?: string;
  title: string;
  lead: string;
  children?: ReactNode;
  media?: ReactNode;
}) {
  return (
    <section className="pub-hero">
      <div className={cx('pub-container', 'pub-hero__grid', media ? 'pub-hero__grid--media' : false)}>
        <div className="pub-hero__content">
          {eyebrow ? <p className="pub-eyebrow">{eyebrow}</p> : null}
          <h1 className="pub-hero__title">{title}</h1>
          <p className="pub-hero__lead">{lead}</p>
          {children ? <div className="pub-actions">{children}</div> : null}
        </div>
        {media ? <div className="pub-hero__media">{media}</div> : null}
      </div>
    </section>
  );
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  align = 'start',
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: 'start' | 'center';
}) {
  return (
    <div className={cx('pub-heading', align === 'center' && 'pub-heading--center')}>
      {eyebrow ? <p className="pub-eyebrow">{eyebrow}</p> : null}
      <h2 id={id} className="pub-heading__title">
        {title}
      </h2>
      {lead ? <p className="pub-heading__lead">{lead}</p> : null}
    </div>
  );
}

export function Split({
  media,
  reverse,
  className,
  children,
}: {
  media: ReactNode;
  reverse?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx('pub-split', reverse && 'pub-split--reverse', className)}>
      <div className="pub-split__text">{children}</div>
      <div className="pub-split__media">{media}</div>
    </div>
  );
}

export function Checklist({
  items,
  className,
}: {
  items: ReactNode[];
  className?: string;
}) {
  return (
    <ul className={cx('pub-checklist', className)}>
      {items.map((item, index) => (
        <li key={typeof item === 'string' ? item : index}>
          <Icon name="check" size={16} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A real photograph. If a file ever goes missing the frame degrades into a
 * quiet, unstriped panel that names what should be there, rather than
 * pretending the image loaded.
 */
export function Shot({
  src,
  alt,
  caption,
  className,
}: {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={cx('pub-shot', className)}>
      {failed ? (
        <div className="pub-shot__fallback" role="img" aria-label={alt}>
          <Icon name="camera" size={20} />
          <span className="pub-shot__fallback-text">{alt}</span>
        </div>
      ) : (
        <img
          className="pub-shot__img"
          src={src}
          alt={alt}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      {caption ? <p className="pub-shot__caption">{caption}</p> : null}
    </div>
  );
}

export function BrowserFrame({
  children,
  url = 'SmartSchool',
}: {
  children: ReactNode;
  url?: string;
}) {
  return (
    <div className="pub-frame">
      <div className="pub-frame__bar" aria-hidden="true">
        <span className="pub-frame__dots">
          <i />
          <i />
          <i />
        </span>
        <span className="pub-frame__url">
          <Icon name="lock" size={12} />
          {url}
        </span>
      </div>
      <div className="pub-frame__view">{children}</div>
    </div>
  );
}

export function BookDemo({
  title,
  lead,
  secondaryLabel,
  secondaryTo,
  id,
  className,
}: {
  title: string;
  lead: string;
  secondaryLabel?: string;
  secondaryTo?: string;
  id?: string;
  className?: string;
}) {
  return (
    <Section id={id} className={cx('pub-cta-wrap', className)}>
      <div className="pub-cta">
        <div className="pub-cta__text">
          <h2>{title}</h2>
          <p>{lead}</p>
        </div>
        <div className="pub-cta__actions">
          <Link to="/site/contact" className="pub-btn pub-btn--primary">
            Book a demo
            <Icon name="arrow-right" size={16} />
          </Link>
          {secondaryTo && secondaryLabel ? (
            <Link to={secondaryTo} className="pub-btn pub-btn--ghost">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
