import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../components/Icon';
import type { SiteFeature, SiteModule, SiteStat } from '../../lib/publicContent';

function cx(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
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
    <div className={cx('site-heading', `site-heading--${align}`)}>
      {eyebrow ? <span className="site-eyebrow">{eyebrow}</span> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
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
      <div className="site-container site-hero__inner">
        <div className="site-hero__content">
          <span className="site-eyebrow site-eyebrow--onDark">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="site-hero__lead">{description}</p>
          {children ? <div className="site-hero__actions">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function FeatureCard({ feature }: { feature: SiteFeature }) {
  return (
    <article className="site-card site-feature">
      <span className="site-card__icon">
        <Icon name={feature.icon} size={22} />
      </span>
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
    </article>
  );
}

export function ModuleCard({ module }: { module: SiteModule }) {
  return (
    <article className="site-card site-module">
      <span className="site-card__icon">
        <Icon name={module.icon} size={20} />
      </span>
      <h3>{module.title}</h3>
      <p>{module.description}</p>
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
      {stats.map((stat) => (
        <div className="site-stat" key={stat.label}>
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
      <div className="site-cta">
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
