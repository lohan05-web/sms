import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AnalyticsArt, DecorShapes, HeroScene } from '../../components/illustrations';
import {
  SITE_FEATURES,
  SITE_MODULES,
  SITE_STATS,
  SITE_STEPS,
} from '../../lib/publicContent';
import {
  CtaBand,
  FeatureCard,
  ModuleCard,
  PeopleCard,
  Section,
  SectionHeading,
  Split,
  StatStrip,
} from './sections';

const PEOPLE = [
  {
    variant: 'teacher' as const,
    title: 'Teachers',
    description:
      'Take the register, plan lessons, record marks and message parents from one simple workspace.',
  },
  {
    variant: 'student' as const,
    title: 'Students',
    description:
      'See timetables, homework, learning material and results — always up to date, always in one place.',
  },
  {
    variant: 'parent' as const,
    title: 'Parents',
    description:
      'Follow attendance, fees, notices and reports, and reach the school whenever it matters.',
  },
];

export function PublicHomePage() {
  return (
    <>
      <section className="site-hero">
        <DecorShapes className="site-hero__decor" />
        <div className="site-container site-hero__inner">
          <div className="site-hero__content site-anim-stack">
            <span className="site-eyebrow site-eyebrow--onDark">
              <Icon name="sparkles" size={14} /> School management, simplified
            </span>
            <h1>
              Run your entire school from <span className="site-grad">one place</span>.
            </h1>
            <p className="site-hero__lead">
              SmartSchool brings admissions, attendance, examinations, fees, transport and
              communication together in a single, secure platform — for administrators, teachers and
              parents.
            </p>
            <div className="site-hero__actions">
              <Link to="/site/modules" className="btn btn--primary">
                Explore modules
                <Icon name="arrow-right" size={16} />
              </Link>
              <Link to="/site/contact" className="btn btn--ghost site-btn--onDark">
                Book a demo
              </Link>
            </div>
            <ul className="site-hero__points">
              <li>
                <Icon name="check" size={15} /> No installation required
              </li>
              <li>
                <Icon name="check" size={15} /> Role-based portals
              </li>
              <li>
                <Icon name="check" size={15} /> Ready in a day
              </li>
            </ul>
          </div>

          <div className="site-hero__visual">
            <HeroScene className="site-hero__art site-illus--float" />
            <div className="site-float site-float--a" aria-hidden="true">
              <span className="site-float__icon">
                <Icon name="trending" size={16} />
              </span>
              <span className="site-float__text">
                <strong>94%</strong>
                <small>Attendance today</small>
              </span>
            </div>
            <div className="site-float site-float--b" aria-hidden="true">
              <span className="site-float__icon">
                <Icon name="finance" size={16} />
              </span>
              <span className="site-float__text">
                <strong>$48.2k</strong>
                <small>Fees collected</small>
              </span>
            </div>
            <div className="site-float site-float--c" aria-hidden="true">
              <span className="site-float__icon">
                <Icon name="inbox" size={16} />
              </span>
              <span className="site-float__text">
                <strong>36</strong>
                <small>Open enquiries</small>
              </span>
            </div>
          </div>
        </div>

        <div className="site-container">
          <StatStrip stats={SITE_STATS} />
        </div>
      </section>

      <Section>
        <SectionHeading
          eyebrow="Why SmartSchool"
          title="Everything your school needs, working together"
          description="Replace disconnected spreadsheets and paper registers with a platform every role can trust."
        />
        <div className="site-grid site-grid--3">
          {SITE_FEATURES.slice(0, 6).map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} delay={index * 70} />
          ))}
        </div>
        <div className="site-center" {...{ 'data-reveal': '' }}>
          <Link to="/site/features" className="site-textlink">
            See all features <Icon name="arrow-right" size={15} />
          </Link>
        </div>
      </Section>

      <Section className="site-section--tint">
        <SectionHeading
          eyebrow="Built for every role"
          title="One platform, everyone included"
          description="From the front office to the family at home — each person sees exactly what they need."
        />
        <div className="site-grid site-grid--3">
          {PEOPLE.map((person, index) => (
            <PeopleCard
              key={person.title}
              variant={person.variant}
              title={person.title}
              description={person.description}
              delay={index * 80}
            />
          ))}
        </div>
      </Section>

      <Section>
        <Split
          media={<AnalyticsArt className="site-panel__art" />}
          className="site-split--panel"
        >
          <SectionHeading
            align="start"
            eyebrow="Clear insight"
            title="Decisions backed by live numbers"
            description="Attendance, results, collections and enquiries update in real time, so leadership always sees the full picture."
          />
          <ul className="site-checklist">
            <li>
              <Icon name="check" size={16} /> Live dashboards for every role
            </li>
            <li>
              <Icon name="check" size={16} /> Class and section level breakdowns
            </li>
            <li>
              <Icon name="check" size={16} /> Export-ready reports in a click
            </li>
          </ul>
        </Split>
      </Section>

      <Section className="site-section--tint">
        <SectionHeading
          eyebrow="Built-in modules"
          title="One platform, every department"
          description="Thirty-plus modules that cover the whole school — from the front office to the finance desk."
        />
        <div className="site-grid site-grid--4">
          {SITE_MODULES.slice(0, 8).map((module, index) => (
            <ModuleCard key={module.title} module={module} delay={index * 50} />
          ))}
        </div>
        <div className="site-center" {...{ 'data-reveal': '' }}>
          <Link to="/site/modules" className="site-textlink">
            Browse all modules <Icon name="arrow-right" size={15} />
          </Link>
        </div>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="How it works"
          title="Up and running in three steps"
        />
        <ol className="site-steps">
          {SITE_STEPS.map((step, index) => (
            <li
              className="site-step site-card--lift"
              key={step.title}
              {...{ 'data-reveal': '', style: { transitionDelay: `${index * 90}ms` } }}
            >
              <span className="site-step__index">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </Section>

      <CtaBand
        title="Ready to see SmartSchool in action?"
        description="Tell us about your school and we will walk you through the platform tailored to your needs."
      />
    </>
  );
}
