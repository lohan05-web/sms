import type { UniversityDashboard } from '@smartschool/shared';
import { Icon } from './Icon';
import { CountUp } from './ui';
import { sharePercentage } from '../lib/university';

type StudentEnrollment = NonNullable<UniversityDashboard['students']>;

const RING_SIZE = 148;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * A redesigned, unique "Student enrollment" panel for the university dashboard:
 * a large student count, an active-student progress ring with a student icon and
 * a compact enrollment summary. Every figure is derived from the existing API data.
 */
export function StudentEnrollmentPanel({ students }: { students: StudentEnrollment }) {
  const other = Math.max(0, students.total - students.male - students.female);
  const activeRate = sharePercentage(students.active, students.total);
  const inactive = Math.max(0, students.total - students.active);
  const classCount = students.byClass.length;

  const ringDash = (Math.min(100, Math.max(0, activeRate)) / 100) * RING_CIRCUMFERENCE;

  const genderTotal = students.male + students.female + other;
  const genderShare = (value: number) => (genderTotal > 0 ? (value / genderTotal) * 100 : 0);

  return (
    <section className="uni-enroll">
      <header className="uni-enroll__head">
        <div className="uni-enroll__intro">
          <p className="uni-enroll__eyebrow">
            <Icon name="students" size={14} />
            Enrollment
          </p>
          <h2 className="uni-enroll__title">Student Enrollment</h2>
          <p className="uni-enroll__subtitle">
            <CountUp value={students.total} /> Students across <CountUp value={classCount} />{' '}
            {classCount === 1 ? 'Class' : 'Classes'}
          </p>
        </div>
        <div className="uni-enroll__active-pill">
          <span className="uni-enroll__active-value">
            <CountUp value={`${activeRate}%`} />
          </span>
          <span className="uni-enroll__active-label">Active</span>
        </div>
      </header>

      <div className="uni-enroll__body">
        <div className="uni-enroll__hero">
          <div
            className="uni-enroll__ring"
            role="img"
            aria-label={`${activeRate}% of ${students.total} students are active`}
          >
            <svg
              className="uni-enroll__ring-svg"
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <linearGradient id="uni-enroll-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
              <circle
                className="uni-enroll__ring-track"
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
              />
              <circle
                className="uni-enroll__ring-value"
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke="url(#uni-enroll-ring)"
                strokeDasharray={`${ringDash} ${RING_CIRCUMFERENCE}`}
              />
            </svg>
            <div className="uni-enroll__ring-center">
              <span className="uni-enroll__ring-icon">
                <Icon name="students" size={26} />
              </span>
              <span className="uni-enroll__ring-rate">
                <CountUp value={`${activeRate}%`} />
              </span>
              <span className="uni-enroll__ring-caption">Active</span>
            </div>
          </div>

          <div className="uni-enroll__figure">
            <p className="uni-enroll__count">
              <CountUp value={students.total} />
            </p>
            <p className="uni-enroll__count-label">Students</p>
            <p className="uni-enroll__classes">
              <CountUp value={classCount} /> {classCount === 1 ? 'Class' : 'Classes'}
            </p>
          </div>
        </div>

        <div className="uni-enroll__summary">
          <h3 className="uni-enroll__summary-title">Enrollment summary</h3>
          <p className="uni-enroll__summary-active">
            <strong>
              <CountUp value={`${activeRate}%`} />
            </strong>{' '}
            Active · <CountUp value={students.active} /> / <CountUp value={students.total} />{' '}
            students
          </p>

          <ul className="uni-enroll__stats">
            <li className="uni-enroll__stat">
              <span className="uni-enroll__stat-value">
                <CountUp value={students.active} />
              </span>
              <span className="uni-enroll__stat-label">Active</span>
            </li>
            <li className="uni-enroll__stat">
              <span className="uni-enroll__stat-value">
                <CountUp value={inactive} />
              </span>
              <span className="uni-enroll__stat-label">Inactive</span>
            </li>
            <li className="uni-enroll__stat">
              <span className="uni-enroll__stat-value">
                <CountUp value={classCount} />
              </span>
              <span className="uni-enroll__stat-label">Classes</span>
            </li>
          </ul>

          <div className="uni-enroll__gender">
            <div
              className="uni-enroll__gender-bar"
              role="img"
              aria-label={`Male ${students.male}, Female ${students.female}, Other ${other}`}
            >
              <span
                className="uni-enroll__gender-seg uni-enroll__gender-seg--male"
                style={{ width: `${genderShare(students.male)}%` }}
              />
              <span
                className="uni-enroll__gender-seg uni-enroll__gender-seg--female"
                style={{ width: `${genderShare(students.female)}%` }}
              />
              <span
                className="uni-enroll__gender-seg uni-enroll__gender-seg--other"
                style={{ width: `${genderShare(other)}%` }}
              />
            </div>
            <ul className="uni-enroll__gender-legend">
              <li>
                <span className="uni-enroll__swatch uni-enroll__swatch--male" />
                Male <strong>{students.male.toLocaleString()}</strong>
              </li>
              <li>
                <span className="uni-enroll__swatch uni-enroll__swatch--female" />
                Female <strong>{students.female.toLocaleString()}</strong>
              </li>
              <li>
                <span className="uni-enroll__swatch uni-enroll__swatch--other" />
                Other <strong>{other.toLocaleString()}</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
