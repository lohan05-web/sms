import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { SITE_MODULES, SITE_MODULE_GROUPS } from '../../lib/publicContent';
import {
  BookDemo,
  Checklist,
  PageHero,
  Section,
  SectionHeading,
  Split,
  Shot,
} from './sections';

export function PublicModulesPage() {
  return (
    <>
      <PageHero
        eyebrow="Modules"
        title="Switch on the parts your school needs"
        lead="Every module sits next to the student record, so information entered in one place is available everywhere it is needed. Start small and add more as the school grows — nothing has to be rebuilt."
      >
        <Link to="/site/contact" className="pub-btn pub-btn--primary">
          Book a demo
          <Icon name="arrow-right" size={16} />
        </Link>
        <Link to="/site/features" className="pub-btn pub-btn--ghost">
          See the features
        </Link>
      </PageHero>

      <Section>
        <SectionHeading
          eyebrow="The full list"
          title="Everything included in the platform"
          lead="These are the working areas you can turn on for your school."
        />
        <div className="mods-index">
          {SITE_MODULES.map((module) => (
            <div className="mod-item" key={module.title}>
              <span className="mod-item__icon">
                <Icon name={module.icon} size={18} />
              </span>
              <div>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="tint">
        <SectionHeading
          eyebrow="Grouped by department"
          title="A module for every team"
          lead="Each part of the school gets the tools it needs, while sharing the same student records underneath."
        />
        <div className="mod-groups">
          {SITE_MODULE_GROUPS.map((group) => (
            <div className="mod-group" key={group.title}>
              <div className="mod-group__head">
                <h3>
                  <Icon name={group.icon} size={18} />
                  {group.title}
                </h3>
                <p>{group.summary}</p>
              </div>
              <Checklist className="pub-checklist--compact" items={group.modules} />
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <Split
          reverse
          media={
            <Shot
              src="/site/shots/dashboard.png"
              alt="The SmartSchool dashboard, summarising students, attendance, fees and exams."
            />
          }
        >
          <h2>One set of records, many ways in</h2>
          <p>
            A student is entered once. Attendance, marks, fees and transport all point back to that
            same record, so the school stops keeping the same details in three different places.
          </p>
          <p>
            Each role sees its own working area. A teacher sees today&apos;s classes and their
            register; the office sees admissions, invoices and records; parents see their own child.
          </p>
        </Split>
      </Section>

      <BookDemo
        title="Start with the modules you need"
        lead="Book a demo and we will show you how the parts fit together for your school."
        secondaryLabel="See the features"
        secondaryTo="/site/features"
      />
    </>
  );
}
