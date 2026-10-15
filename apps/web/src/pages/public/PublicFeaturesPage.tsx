import { Icon } from '../../components/Icon';
import { SITE_FEATURES } from '../../lib/publicContent';
import { CtaBand, FeatureCard, PageHero, Section, SectionHeading } from './sections';

const HIGHLIGHTS = [
  {
    icon: 'finance' as const,
    title: 'A fee desk that chases itself',
    points: [
      'Generate invoices for a whole class in one action',
      'Record part-payments and see running balances',
      'Spot defaulters by class and section instantly',
    ],
  },
  {
    icon: 'marks' as const,
    title: 'Report cards without the headache',
    points: [
      'Enter marks once, reuse them everywhere',
      'Automatic grading and positions',
      'Print-ready report cards for every student',
    ],
  },
  {
    icon: 'messages' as const,
    title: 'Communication parents actually read',
    points: [
      'Pin important notices to the top',
      'Real-time messaging with staff and parents',
      'Notifications that reach the right people',
    ],
  },
];

export function PublicFeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Powerful where it matters, simple where it counts"
        description="A deep feature set wrapped in an interface anyone on your staff can pick up quickly."
      />

      <Section>
        <div className="site-grid site-grid--3">
          {SITE_FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </Section>

      <Section className="site-section--tint">
        <SectionHeading
          eyebrow="In focus"
          title="The details that save the most time"
        />
        <div className="site-highlights">
          {HIGHLIGHTS.map((item) => (
            <article className="site-card site-highlight" key={item.title}>
              <span className="site-card__icon">
                <Icon name={item.icon} size={22} />
              </span>
              <h3>{item.title}</h3>
              <ul className="site-checklist">
                {item.points.map((point) => (
                  <li key={point}>
                    <Icon name="check" size={15} />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <CtaBand
        title="See these features with your own data"
        description="Book a walkthrough and we will show you exactly how SmartSchool would work for your school."
      />
    </>
  );
}
