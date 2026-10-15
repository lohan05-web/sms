import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { SITE_FAQ } from '../../lib/publicContent';
import { CtaBand, PageHero, Section } from './sections';

export function PublicFaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Questions, answered"
        description="Everything you might want to know before choosing SmartSchool for your school."
      />

      <Section>
        <div className="site-faq">
          {SITE_FAQ.map((item, index) => (
            <details className="site-faq__item" key={item.question} open={index === 0}>
              <summary>
                <span>{item.question}</span>
                <Icon name="chevron-right" size={18} />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
        <p className="site-fineprint site-center">
          Still have a question? <Link to="/site/contact" className="site-textlink">Contact our team</Link>
        </p>
      </Section>

      <CtaBand
        title="Ready to get started?"
        description="Book a demo and we will answer anything the FAQ could not."
      />
    </>
  );
}
