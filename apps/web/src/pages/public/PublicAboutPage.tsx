import { Icon } from '../../components/Icon';
import { ClassroomArt, LearningArt } from '../../components/illustrations';
import { SITE_STATS, SITE_VALUES } from '../../lib/publicContent';
import {
  CtaBand,
  PeopleCard,
  PageHero,
  Section,
  SectionHeading,
  Split,
  StatStrip,
} from './sections';

const TEAM = [
  {
    variant: 'teacher' as const,
    title: 'Educators first',
    description:
      'Many of us taught in classrooms before we wrote a line of code, so we design around the school day.',
  },
  {
    variant: 'student' as const,
    title: 'Students at the centre',
    description:
      'Every decision is measured against one question: does this help a student learn better?',
  },
  {
    variant: 'parent' as const,
    title: 'Partners with families',
    description:
      'We keep parents informed and involved, because learning works best when everyone is connected.',
  },
];

export function PublicAboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Technology that gives teachers their time back"
        description="SmartSchool began with a simple belief: a school's software should disappear into the background so educators can focus on students, not spreadsheets."
      />

      <Section>
        <Split
          media={
            <div className="site-panel">
              <ClassroomArt className="site-panel__art" />
              <div className="site-quotebox site-quotebox--panel">
                <Icon name="star" size={20} />
                <p>
                  &ldquo;We wanted a system a new teacher could learn in an afternoon and a principal
                  could trust for a decade.&rdquo;
                </p>
              </div>
            </div>
          }
        >
          <h2>Our mission</h2>
          <p>
            Schools are asked to do more with less every year — more reporting, more compliance, more
            communication. We build tools that remove the busywork so that principals, teachers and
            support staff can spend their energy where it matters most.
          </p>
          <p>
            Every module in SmartSchool is designed around the real rhythm of a school day: the
            morning register, the lesson that needs planning, the exam that needs grading, the parent
            who needs an answer. If it does not save someone time, it does not ship.
          </p>
        </Split>
      </Section>

      <Section className="site-section--tint">
        <Split
          reverse
          media={
            <div className="site-panel">
              <LearningArt className="site-panel__art" />
            </div>
          }
        >
          <h2>What guides us</h2>
          <p>
            We are a team of educators, engineers and school administrators who have lived the
            problems we solve. That perspective shapes everything from the words on a button to the
            reports a board of governors asks for.
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
        </Split>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Who we build for"
          title="A platform that respects every role"
          description="The people who use SmartSchool every day shape how it feels and works."
        />
        <div className="site-grid site-grid--3">
          {TEAM.map((member, index) => (
            <PeopleCard
              key={member.title}
              variant={member.variant}
              title={member.title}
              description={member.description}
              delay={index * 80}
            />
          ))}
        </div>
      </Section>

      <Section className="site-section--tint">
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
