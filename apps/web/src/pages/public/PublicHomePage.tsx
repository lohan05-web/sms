import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
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
  Section,
  SectionHeading,
  StatStrip,
} from './sections';

export function PublicHomePage() {
  return (
    <>
      <section className="site-hero">
        <div className="site-container site-hero__inner">
          <div className="site-hero__content">
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

          <div className="site-hero__visual" aria-hidden="true">
            <div className="mock">
              <div className="mock__bar">
                <span />
                <span />
                <span />
              </div>
              <div className="mock__body">
                <div className="mock__stats">
                  <div className="mock__stat">
                    <small>Attendance today</small>
                    <strong>94%</strong>
                  </div>
                  <div className="mock__stat">
                    <small>Fees collected</small>
                    <strong>$48.2k</strong>
                  </div>
                  <div className="mock__stat">
                    <small>Open enquiries</small>
                    <strong>36</strong>
                  </div>
                </div>
                <div className="mock__chart">
                  <span style={{ height: '42%' }} />
                  <span style={{ height: '66%' }} />
                  <span style={{ height: '54%' }} />
                  <span style={{ height: '82%' }} />
                  <span style={{ height: '70%' }} />
                  <span style={{ height: '92%' }} />
                  <span style={{ height: '61%' }} />
                </div>
                <div className="mock__rows">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
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
          {SITE_FEATURES.slice(0, 6).map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
        <div className="site-center">
          <Link to="/site/features" className="site-textlink">
            See all features <Icon name="arrow-right" size={15} />
          </Link>
        </div>
      </Section>

      <Section className="site-section--tint">
        <SectionHeading
          eyebrow="Built-in modules"
          title="One platform, every department"
          description="Thirty-plus modules that cover the whole school — from the front office to the finance desk."
        />
        <div className="site-grid site-grid--4">
          {SITE_MODULES.slice(0, 8).map((module) => (
            <ModuleCard key={module.title} module={module} />
          ))}
        </div>
        <div className="site-center">
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
            <li className="site-step" key={step.title}>
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
