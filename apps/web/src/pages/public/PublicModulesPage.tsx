import { Icon } from '../../components/Icon';
import { ClassroomArt } from '../../components/illustrations';
import { SITE_MODULES, SITE_MODULE_GROUPS } from '../../lib/publicContent';
import { CtaBand, ModuleCard, PageHero, Section, SectionHeading, Split } from './sections';

export function PublicModulesPage() {
  return (
    <>
      <PageHero
        eyebrow="Modules"
        title="Thirty-plus modules, one connected platform"
        description="Switch on the modules you need today and add more as your school grows — no re-implementation, no data silos."
      />

      <Section>
        <div className="site-grid site-grid--4">
          {SITE_MODULES.map((module, index) => (
            <ModuleCard key={module.title} module={module} delay={index * 45} />
          ))}
        </div>
      </Section>

      <Section className="site-section--tint">
        <SectionHeading
          eyebrow="Grouped by department"
          title="A module for every team"
          description="Each area of the school gets the tools it needs, while sharing one source of truth."
        />
        <div className="site-grid site-grid--3">
          {SITE_MODULE_GROUPS.map((group, index) => (
            <article
              className="site-card site-group site-card--lift"
              key={group.title}
              {...{ 'data-reveal': '', style: { transitionDelay: `${index * 80}ms` } }}
            >
              <span className="site-card__icon site-card__icon--pulse">
                <Icon name={group.icon} size={22} />
              </span>
              <h3>{group.title}</h3>
              <p>{group.summary}</p>
              <ul className="site-checklist site-checklist--compact">
                {group.modules.map((module) => (
                  <li key={module}>
                    <Icon name="check" size={14} />
                    {module}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <Split
          media={
            <div className="site-panel">
              <ClassroomArt className="site-panel__art" />
            </div>
          }
        >
          <SectionHeading
            align="start"
            eyebrow="One source of truth"
            title="Data flows between modules for you"
            description="A student admitted on Monday is on the register, the timetable, the fee ledger and the gradebook — without anyone copying a thing."
          />
          <ul className="site-checklist">
            <li>
              <Icon name="check" size={16} /> No duplicate entry between departments
            </li>
            <li>
              <Icon name="check" size={16} /> Permissions that respect every role
            </li>
            <li>
              <Icon name="check" size={16} /> Add modules without disturbing existing data
            </li>
          </ul>
        </Split>
      </Section>

      <CtaBand
        title="Not sure which modules you need?"
        description="Tell us how your school runs today and we will map the right modules to your workflow."
      />
    </>
  );
}
