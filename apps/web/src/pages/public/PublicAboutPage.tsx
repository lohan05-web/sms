import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { SITE_VALUES } from '../../lib/publicContent';
import { BookDemo, Checklist, PageHero, Section, SectionHeading, Shot, Split } from './sections';

const ROLES = [
  {
    title: 'Principals and heads',
    body: 'Attendance, fee collection and exam performance for the whole school on one page, without waiting for a report to be compiled by hand.',
  },
  {
    title: 'The school office',
    body: 'Admissions, student records, invoices and receipts kept together, so a parent query is answered at the front desk rather than after lunch.',
  },
  {
    title: 'Teachers',
    body: 'Take the register, set homework and enter marks from the class screen, without leaving the room or filling in a paper sheet later.',
  },
  {
    title: 'Parents',
    body: 'Follow attendance, fees, homework and results from a phone, whenever it suits them, instead of calling the office to ask.',
  },
];

const PRINCIPLES = [
  'One platform, with a separate portal for each role',
  'Role-based permissions, so staff only see what they need',
  'An audit log that records sensitive actions',
  'Data held in an encrypted, backed-up database',
  'Updates delivered in the browser, with nothing to reinstall',
];

export function PublicAboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About SmartSchool"
        title="Software that fits the school day"
        lead="SmartSchool exists to take the repetitive admin out of running a school — the registers, the invoices, the report cards, the messages home — so staff can spend that time with students instead."
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
        <Split
          media={
            <Shot
              src="/site/photos/school-office.jpg"
              alt="A member of school staff at work in an office."
            />
          }
        >
          <SectionHeading
            title="Why it is built this way"
            lead="Ask anyone behind a school desk what fills their day and you will hear the same answers: marking attendance, chasing fee payments, entering marks and answering the same questions from parents. None of it is difficult on its own — there is simply a lot of it."
          />
          <p className="about-followup">
            So SmartSchool keeps those jobs in one place, on screens that follow the way a school
            already works. A teacher marks a register the way they always have, and the office sees
            it immediately — no photocopying, no retyping, no waiting for a slip of paper to reach
            the front desk.
          </p>
        </Split>
      </Section>

      <Section tone="tint">
        <SectionHeading
          eyebrow="What we care about"
          title="Four things we try to get right"
          lead="Every screen is measured against the same short list."
        />
        <div className="about-values">
          {SITE_VALUES.map((value) => (
            <div className="about-value" key={value.title}>
              <span className="about-value__icon">
                <Icon name={value.icon} size={18} />
              </span>
              <div>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Who it is for"
          title="Built around the people in a school"
          lead="Everyone gets a portal that shows only the work they actually do."
        />
        <div className="about-roles">
          {ROLES.map((role) => (
            <div className="about-role" key={role.title}>
              <h3>{role.title}</h3>
              <p>{role.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="tint">
        <Split
          reverse
          media={
            <Shot
              src="/site/photos/staff-room.jpg"
              alt="A small group of colleagues talking over laptops around a table."
            />
          }
        >
          <h2>How SmartSchool is put together</h2>
          <p>
            The platform is web-based, so there is nothing to install on school machines and nothing
            to maintain on your side. Whatever you switch on, it sits in the same place next to the
            student record.
          </p>
          <Checklist items={PRINCIPLES} />
        </Split>
      </Section>

      <BookDemo
        title="Want to see how it would work at your school?"
        lead="Book a demo and take a look around SmartSchool."
        secondaryLabel="Read the FAQ"
        secondaryTo="/site/faq"
      />
    </>
  );
}
