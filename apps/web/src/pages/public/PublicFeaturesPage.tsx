import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../components/Icon';
import {
  BookDemo,
  Checklist,
  PageHero,
  Section,
  SectionHeading,
  Shot,
  Split,
  cx,
} from './sections';

interface FeatureRow {
  icon: IconName;
  tag: string;
  title: string;
  body: string;
  points: string[];
  shot: { src: string; alt: string };
}

const ROWS: FeatureRow[] = [
  {
    icon: 'attendance',
    tag: 'Attendance',
    title: 'The register, done in seconds',
    body: 'A teacher marks a whole section present, then flags the absences. The office and the class teacher see the same list at the same moment, so a follow-up happens that morning rather than at the end of the term.',
    points: [
      'Mark a whole section in one pass',
      'Flag absences and leave as they happen',
      'See attendance patterns for each section',
    ],
    shot: {
      src: '/site/shots/attendance.jpg',
      alt: 'Students and their teacher in a classroom.',
    },
  },
  {
    icon: 'finance',
    tag: 'Fees and invoicing',
    title: 'A fee desk that keeps count',
    body: 'Set up your fee structure once, then generate invoices for a whole class together. Record part-payments against them and the fee desk shows what is still outstanding, so reminders reach the families they concern.',
    points: [
      'Generate invoices for a whole class',
      'Record part-payments and running balances',
      'Spot outstanding balances by class and section',
    ],
    shot: {
      src: '/site/shots/fees.jpg',
      alt: 'A staff member working at a desk.',
    },
  },
  {
    icon: 'marks',
    tag: 'Exams and report cards',
    title: 'Report cards without the late night',
    body: 'Marks are entered once, then reused wherever they are needed. Grades and positions come out of your own grading scheme, and every report card is ready to print or share with parents.',
    points: [
      'Enter marks once, reuse them everywhere',
      'Automatic grading and class positions',
      'Print-ready report cards for every student',
    ],
    shot: {
      src: '/site/shots/exams.jpg',
      alt: 'Students writing an examination in a hall, seen from behind.',
    },
  },
  {
    icon: 'messages',
    tag: 'Messaging and notices',
    title: 'Updates parents actually read',
    body: 'Put a notice at the top of the board for the whole school, or message a single class. Replies stay on the same thread, next to the student record, so nothing important gets lost in a group chat.',
    points: [
      'One notice board for the whole school',
      'Real-time messages with staff and parents',
      'Conversations kept beside the student record',
    ],
    shot: {
      src: '/site/shots/notices.jpg',
      alt: 'A close-up of someone reading a message on a phone.',
    },
  },
];

const DETAILS = [
  'Import a student list from a spreadsheet',
  'Bulk-generate invoices for a whole class',
  'Export attendance, marks and finance when you need them',
  'Build a weekly timetable without clashes',
  'Track library loans and overdue returns',
  'Keep an audit log of sensitive actions',
  'Give every role its own portal and permissions',
  'Use it on a phone, a tablet or a school desktop',
];

export function PublicFeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="The day-to-day work, handled properly"
        lead="SmartSchool covers the jobs that fill a school day — attendance, fees, exams, records and messages home — with screens built for the people who use them."
      >
        <Link to="/site/contact" className="pub-btn pub-btn--primary">
          Book a demo
          <Icon name="arrow-right" size={16} />
        </Link>
        <Link to="/site/modules" className="pub-btn pub-btn--ghost">
          Browse the modules
        </Link>
      </PageHero>

      <Section>
        {ROWS.map((row, index) => (
          <div className={cx('feat-row', index % 2 === 1 && 'feat-row--reverse')} key={row.title}>
            <div className="feat-row__text">
              <span className="feat-row__tag">
                <Icon name={row.icon} size={15} />
                {row.tag}
              </span>
              <h3>{row.title}</h3>
              <p>{row.body}</p>
              <Checklist items={row.points} />
            </div>
            <div className="feat-row__media">
              <Shot src={row.shot.src} alt={row.shot.alt} />
            </div>
          </div>
        ))}
      </Section>

      <Section tone="tint">
        <Split
          media={
            <Shot
              src="/site/photos/classroom.jpg"
              alt="Students studying together in a classroom."
            />
          }
        >
          <h2>The small things that add up</h2>
          <p>
            The features that save a school the most time are rarely the headline ones. They are the
            imports, the bulk actions and the small permissions that stop a job spilling over into
            someone else&apos;s afternoon.
          </p>
          <Checklist items={DETAILS} />
        </Split>
      </Section>

      <BookDemo
        title="See these features with your own data"
        lead="Book a demo and we will walk through the screens that matter most to your school."
        secondaryLabel="Browse the modules"
        secondaryTo="/site/modules"
      />

      <Section>
        <SectionHeading
          align="center"
          title="Not sure where to start?"
          lead="Take a look at the modules, or see how schools usually put them together."
        />
        <div className="pub-actions pub-actions--center">
          <Link to="/site/modules" className="pub-btn pub-btn--ghost">
            Explore the modules
          </Link>
          <Link to="/site/plans" className="pub-btn pub-btn--text">
            Compare plans
          </Link>
        </div>
      </Section>
    </>
  );
}
