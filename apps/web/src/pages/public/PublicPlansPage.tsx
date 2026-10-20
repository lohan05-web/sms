import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { SITE_PLANS } from '../../lib/publicContent';
import { BookDemo, Checklist, PageHero, Section, SectionHeading, cx } from './sections';

const INCLUDED = [
  'A portal for every role, from principal to parent',
  'Role-based permissions and an audit log',
  'Browser access on any school device — nothing to install',
  'Data held in an encrypted, backed-up database',
  'Updates delivered automatically, with no extra charge',
  'Help with importing your student list',
];

export function PublicPlansPage() {
  return (
    <>
      <PageHero
        eyebrow="Plans"
        title="Plans that grow with the school"
        lead="Start with the essentials and add finance, transport and parent messaging when you are ready. There is no re-implementation and no data to move."
      >
        <Link to="/site/contact" className="pub-btn pub-btn--primary">
          Book a demo
          <Icon name="arrow-right" size={16} />
        </Link>
        <Link to="/site/faq" className="pub-btn pub-btn--ghost">
          Read the FAQ
        </Link>
      </PageHero>

      <Section>
        <div className="plans">
          {SITE_PLANS.map((plan) => (
            <div className={cx('plan', plan.highlighted && 'plan--featured')} key={plan.name}>
              {plan.highlighted ? <span className="plan__tag">Most chosen</span> : null}
              <h3>{plan.name}</h3>
              <p className="plan__tagline">{plan.tagline}</p>
              <div className="plan__price">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </div>
              <Checklist className="pub-checklist--compact" items={plan.features} />
              <Link
                to="/site/contact"
                className={cx('pub-btn', plan.highlighted ? 'pub-btn--primary' : 'pub-btn--ghost')}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="fineprint">
          Prices are shown for guidance only. Book a demo and we will confirm the details for your
          school.
        </p>
      </Section>

      <Section tone="tint">
        <SectionHeading
          eyebrow="In every plan"
          title="The basics never change"
          lead="Whichever plan you choose, the platform works the same way underneath."
        />
        <ul className="plans-included">
          {INCLUDED.map((item) => (
            <li key={item}>
              <Icon name="check" size={16} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionHeading
          align="center"
          title="How schools usually start"
          lead="Most begin with records and attendance, settle in for a term, then add finance and messaging once the routine is running."
        />
      </Section>

      <BookDemo
        title="Not sure which plan fits?"
        lead="Book a demo and we will talk through the options for your school."
        secondaryLabel="Read the FAQ"
        secondaryTo="/site/faq"
      />
    </>
  );
}
