import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { SITE_PLANS } from '../../lib/publicContent';
import { CtaBand, PageHero, Section, SectionHeading } from './sections';

const INCLUDED = [
  'Secure role-based access control',
  'Web-based — nothing to install',
  'Audit log for sensitive actions',
  'Free updates and improvements',
  'Encrypted, backed-up database',
  'Onboarding and data import help',
];

export function PublicPlansPage() {
  return (
    <>
      <PageHero
        eyebrow="Plans"
        title="Straightforward pricing that grows with you"
        description="Start free, then add finance, transport and communication as you need them. No hidden fees, no lock-in surprises."
      />

      <Section>
        <div className="site-plans">
          {SITE_PLANS.map((plan) => (
            <article
              className={`site-card site-plan${plan.highlighted ? ' site-plan--featured' : ''}`}
              key={plan.name}
            >
              {plan.highlighted ? <span className="site-plan__tag">Most popular</span> : null}
              <h3>{plan.name}</h3>
              <p className="site-plan__tagline">{plan.tagline}</p>
              <div className="site-plan__price">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </div>
              <ul className="site-checklist">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Icon name="check" size={15} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to={plan.name === 'Starter' ? '/login' : '/site/contact'}
                className={`btn ${plan.highlighted ? 'btn--primary' : 'btn--ghost'} btn--block`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
        <p className="site-fineprint">
          Prices are indicative and shown in USD. Every plan can be tailored — talk to us about
          multi-campus needs, annual billing or a not-for-profit discount.
        </p>
      </Section>

      <Section className="site-section--tint">
        <SectionHeading
          eyebrow="Always included"
          title="Every plan comes with the essentials"
        />
        <ul className="site-included">
          {INCLUDED.map((item) => (
            <li key={item}>
              <span className="site-card__icon">
                <Icon name="check" size={16} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand
        title="Questions about pricing?"
        description="We will help you find the plan that matches your school's size and budget."
        secondaryLabel="Read the FAQ"
        secondaryTo="/site/faq"
      />
    </>
  );
}
