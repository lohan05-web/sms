import { Icon } from '../../components/Icon';
import { SITE_MODULES, SITE_MODULE_GROUPS } from '../../lib/publicContent';
import { CtaBand, ModuleCard, PageHero, Section, SectionHeading } from './sections';

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
          {SITE_MODULES.map((module) => (
            <ModuleCard key={module.title} module={module} />
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
          {SITE_MODULE_GROUPS.map((group) => (
            <article className="site-card site-group" key={group.title}>
              <span className="site-card__icon">
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

      <CtaBand
        title="Not sure which modules you need?"
        description="Tell us how your school runs today and we will map the right modules to your workflow."
      />
    </>
  );
}
