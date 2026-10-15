import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../components/Icon';
import { AvatarArt, DecorShapes } from '../../components/illustrations';
import type { SiteFeature, SiteModule, SiteStat } from '../../lib/publicContent';

function cx(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

export function revealAttrs(delay?: number): { 'data-reveal': string; style?: CSSProperties } {
  return delay === undefined
    ? { 'data-reveal': '' }
    : { 'data-reveal': '', style: { transitionDelay: `${delay}ms` } };
}

export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cx('site-section', className)}>
      <div className="site-container">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'center' | 'start';
}) {
  return (
    <div className={cx('site-heading', `site-heading--${align}`)} {...revealAttrs()}>
      {eyebrow ? <span className="site-eyebrow">{eyebrow}</span> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function Split({
  reverse,
  media,
  className,
  children,
}: {
  reverse?: boolean;
  media: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const splitClass = ['site-split', reverse && 'site-split--reverse', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={splitClass}>
      <div className="site-split__text" {...revealAttrs()}>
        {children}
      </div>
      <div className="site-split__media" {...revealAttrs(90)}>
        {media}
      </div>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="site-hero site-hero--compact">
      <DecorShapes className="site-hero__decor" />
      <div className="site-container site-hero__inner">
        <div className="site-hero__content site-anim-stack">
          <span className="site-eyebrow site-eyebrow--onDark">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="site-hero__lead">{description}</p>
          {children ? <div className="site-hero__actions">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function FeatureCard({ feature, delay }: { feature: SiteFeature; delay?: number }) {
  return (
    <article className="site-card site-feature site-card--lift" {...revealAttrs(delay)}>
      <span className="site-card__icon site-card__icon--pulse">
        <Icon name={feature.icon} size={22} />
      </span>
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
    </article>
  );
}

export function ModuleCard({ module, delay }: { module: SiteModule; delay?: number }) {
  return (
    <article className="site-card site-module site-card--lift" {...revealAttrs(delay)}>
      <span className="site-card__icon site-card__icon--pulse">
        <Icon name={module.icon} size={20} />
      </span>
      <h3>{module.title}</h3>
      <p>{module.description}</p>
    </article>
  );
}

export function PeopleCard({
  variant,
  title,
  description,
  delay,
}: {
  variant: 'teacher' | 'student' | 'parent';
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <article className="site-person site-card--lift" {...revealAttrs(delay)}>
      <AvatarArt variant={variant} className="site-person__art" />
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

export function IconBadge({ name }: { name: IconName }) {
  return (
    <span className="site-badge">
      <Icon name={name} size={18} />
    </span>
  );
}

export function StatStrip({ stats }: { stats: SiteStat[] }) {
  return (
    <div className="site-stats">
      {stats.map((stat, index) => (
        <div className="site-stat" key={stat.label} {...revealAttrs(index * 70)}>
          <span className="site-stat__value">{stat.value}</span>
          <span className="site-stat__label">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

export function CtaBand({
  title,
  description,
  primaryLabel = 'Book a demo',
  primaryTo = '/site/contact',
  secondaryLabel = 'See the modules',
  secondaryTo = '/site/modules',
}: {
  title: string;
  description: string;
  primaryLabel?: string;
  primaryTo?: string;
  secondaryLabel?: string;
  secondaryTo?: string;
}) {
  return (
    <Section className="site-cta-wrap">
      <div className="site-cta site-cta--animate" {...revealAttrs()}>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="site-cta__actions">
          <Link to={primaryTo} className="btn btn--primary">
            {primaryLabel}
            <Icon name="arrow-right" size={16} />
          </Link>
          <Link to={secondaryTo} className="btn btn--ghost site-btn--onDark">
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </Section>
  );
}
