import { Icon } from '../../components/Icon';
import { SITE_STATS, SITE_VALUES } from '../../lib/publicContent';
import { CtaBand, PageHero, Section, SectionHeading, StatStrip } from './sections';

export function PublicAboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Technology that gives teachers their time back"
        description="SmartSchool began with a simple belief: a school's software should disappear into the background so educators can focus on students, not spreadsheets."
      />

      <Section>
        <div className="site-split">
          <div className="site-split__text">
            <h2>Our mission</h2>
            <p>
              Schools are asked to do more with less every year — more reporting, more compliance,
              more communication. We build tools that remove the busywork so that principals,
              teachers and support staff can spend their energy where it matters most.
            </p>
            <p>
              Every module in SmartSchool is designed around the real rhythm of a school day: the
              morning register, the lesson that needs planning, the exam that needs grading, the
              parent who needs an answer. If it does not save someone time, it does not ship.
            </p>
          </div>
          <div className="site-split__aside">
            <div className="site-quotebox">
              <Icon name="star" size={20} />
              <p>
                &ldquo;We wanted a system a new teacher could learn in an afternoon and a principal
                could trust for a decade.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section className="site-section--tint">
        <div className="site-split site-split--reverse">
          <div className="site-split__text">
            <h2>What guides us</h2>
            <p>
              We are a team of educators, engineers and school administrators who have lived the
              problems we solve. That perspective shapes everything from the words on a button to
              the reports a board of governors asks for.
            </p>
            <div className="site-grid site-grid--2 site-grid--tight">
              {SITE_VALUES.map((value) => (
                <div className="site-value" key={value.title}>
                  <span className="site-card__icon">
                    <Icon name={value.icon} size={18} />
                  </span>
                  <div>
                    <h3>{value.title}</h3>
                    <p>{value.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="By the numbers"
          title="Designed to fit schools of every size"
        />
        <StatStrip stats={SITE_STATS} />
      </Section>

      <CtaBand
        title="Want to know if SmartSchool fits your school?"
        description="Share a few details and our team will recommend the right plan for you."
        secondaryLabel="Read the FAQ"
        secondaryTo="/site/faq"
      />
    </>
  );
}
