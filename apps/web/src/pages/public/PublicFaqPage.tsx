import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { SITE_FAQ } from '../../lib/publicContent';
import { BookDemo, PageHero, Section } from './sections';

export function PublicFaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Questions, answered"
        lead="The things schools usually ask before they book a demo. If yours is not here, send us a message and we will answer it plainly."
      >
        <Link to="/site/contact" className="pub-btn pub-btn--primary">
          Ask a question
          <Icon name="arrow-right" size={16} />
        </Link>
        <Link to="/site/plans" className="pub-btn pub-btn--ghost">
          See the plans
        </Link>
      </PageHero>

      <Section>
        <div className="faq-layout">
          <div className="faq-list">
            {SITE_FAQ.map((item, index) => (
              <details className="faq-item" key={item.question} open={index === 0}>
                <summary>
                  <span>{item.question}</span>
                  <Icon name="chevron-right" size={18} className="faq-item__chevron" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>

          <aside className="faq-aside">
            <h3>Still have a question?</h3>
            <p>
              Tell us how your school works and we will tell you honestly whether SmartSchool fits.
            </p>
            <Link to="/site/contact" className="pub-btn pub-btn--primary">
              Contact us
            </Link>
          </aside>
        </div>
      </Section>

      <BookDemo
        title="Still weighing it up?"
        lead="Book a demo and see SmartSchool with your own classes and students in mind."
        secondaryLabel="Compare plans"
        secondaryTo="/site/plans"
      />
    </>
  );
}
