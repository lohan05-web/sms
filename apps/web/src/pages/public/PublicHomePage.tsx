import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { BookDemo, BrowserFrame, Section, SectionHeading, Shot, cx } from './sections';
import './PublicHomePage.css';

/**
 * Public home page.
 *
 * The hero shows the SmartSchool dashboard itself; every other visual is a
 * photograph of the work the software is built for, stored under `/site/shots/`
 * and `/site/photos/`. If a file is ever missing the shared `Shot` component
 * falls back to a quiet panel carrying the same alternative text, so the page
 * never pretends an image loaded.
 */

const SHOTS = {
  dashboard: {
    src: '/site/shots/dashboard.png',
    alt: 'The SmartSchool dashboard, with a summary of students, attendance, fees and exams.',
  },
  attendance: {
    src: '/site/shots/attendance.jpg',
    alt: 'Students and their teacher in a classroom.',
  },
  fees: {
    src: '/site/shots/fees.jpg',
    alt: 'A staff member working at a desk.',
  },
  exams: {
    src: '/site/shots/exams.jpg',
    alt: 'Students writing an examination in a hall, seen from behind.',
  },
  transport: {
    src: '/site/shots/transport.jpg',
    alt: 'Children boarding a school bus.',
  },
  notices: {
    src: '/site/shots/notices.jpg',
    alt: 'A close-up of someone reading a message on a phone.',
  },
};

const WORK = [
  {
    icon: 'attendance' as const,
    title: 'Attendance',
    body: 'A teacher marks the register for their class and the office can see who is missing that same morning, so an absence is followed up while it still matters.',
    shot: SHOTS.attendance,
  },
  {
    icon: 'finance' as const,
    title: 'Fees',
    body: 'The fee desk keeps invoices, part-payments and outstanding balances in one list, so reminders go to the families who actually owe something.',
    shot: SHOTS.fees,
  },
  {
    icon: 'marks' as const,
    title: 'Exams and report cards',
    body: 'Marks are entered once. Grades, positions and report cards are worked out from your own grading scheme, then shared with parents.',
    shot: SHOTS.exams,
  },
  {
    icon: 'bus' as const,
    title: 'School transport',
    body: 'Vehicles, routes and stops live in one list, so the office can answer a parent asking which bus their child is on.',
    shot: SHOTS.transport,
  },
  {
    icon: 'messages' as const,
    title: 'Notices home',
    body: 'Send a notice to the whole school or a single class, and keep the message thread in the same place as the student record.',
    shot: SHOTS.notices,
  },
];

const STORY = [
  {
    time: '8:40 am',
    title: 'Take the register',
    body: 'A teacher marks their class present and absent. The office sees the absences straight away.',
  },
  {
    time: '11:00 am',
    title: 'Chase the fees',
    body: 'The admin opens the fee desk, checks what is still outstanding and sends a reminder to those parents.',
  },
  {
    time: '3:30 pm',
    title: 'Finish the reports',
    body: 'Marks are in, grades are worked out and report cards are ready to share with parents.',
  },
];

const GALLERY = [
  {
    caption: 'Dashboard',
    copy: 'The day at a glance for the front office.',
    shot: SHOTS.dashboard,
  },
  {
    caption: 'Fee desk',
    copy: 'Invoices, payments and whatever is still due.',
    shot: SHOTS.fees,
  },
  {
    caption: 'Notices',
    copy: 'One message, sent to exactly the right parents.',
    shot: SHOTS.notices,
  },
];

export function PublicHomePage() {
  return (
    <div className="home">
      <section className="home-hero">
        <div className="pub-container home-hero__grid">
          <div className="home-hero__text">
            <h1 className="home-hero__title">
              Less time chasing paperwork. More time running your school.
            </h1>
            <p className="home-hero__lead">
              Keep student attendance, fee payments, exam results, parent updates and school
              transport organised in one place. Your staff can spend less time updating records and
              more time helping students.
            </p>
            <div className="pub-actions">
              <Link to="/site/contact" className="pub-btn pub-btn--primary">
                Book a demo
                <Icon name="arrow-right" size={16} />
              </Link>
              <a href="#how-it-works" className="pub-btn pub-btn--text">
                See how it works
              </a>
            </div>
          </div>
          <div className="home-hero__media">
            <BrowserFrame url="SmartSchool — Dashboard">
              <Shot src={SHOTS.dashboard.src} alt={SHOTS.dashboard.alt} />
            </BrowserFrame>
          </div>
        </div>
      </section>

      <Section id="how-it-works" tone="tint">
        <SectionHeading
          title="Everyday school work, handled in one place"
          lead="The tasks that eat into teaching time, each with a screen that keeps the details together."
        />

        <div className="home-work">
          {WORK.map((item, index) => (
            <div
              className={cx('home-row', index % 2 === 1 && 'home-row--reverse')}
              key={item.title}
            >
              <div className="home-row__media">
                <Shot src={item.shot.src} alt={item.shot.alt} />
              </div>
              <div className="home-row__text">
                <span className="home-row__icon" aria-hidden="true">
                  <Icon name={item.icon} size={20} />
                </span>
                <h3 className="home-row__title">{item.title}</h3>
                <p className="home-row__body">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="home-story">
          <SectionHeading
            title="A school day, step by step"
            lead="Three small moments from one day, to show how attendance, fees and exams fit together."
          />
          <p className="home-story__note">An illustrative workflow, not a real customer story.</p>

          <ol className="home-steps">
            {STORY.map((step) => (
              <li className="home-step" key={step.time}>
                <span className="home-step__time">{step.time}</span>
                <h3 className="home-step__title">{step.title}</h3>
                <p className="home-step__body">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section tone="tint">
        <SectionHeading
          title="A closer look"
          lead="The dashboard itself, and two of the jobs it supports through the day."
        />
        <div className="home-gallery">
          {GALLERY.map((item) => (
            <figure className="home-gallery__item" key={item.caption}>
              <Shot src={item.shot.src} alt={item.shot.alt} />
              <figcaption>
                <strong>{item.caption}</strong>
                <span>{item.copy}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <BookDemo
        title="Want to see how it would work at your school?"
        lead="Book a demo and take a look around SmartSchool."
      />
    </div>
  );
}
