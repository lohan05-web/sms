import type { UniversityDashboard, UniversityNameCount } from '@smartschool/shared';
import { Icon } from './Icon';
import { sharePercentage } from '../lib/university';

type StudentEnrollment = NonNullable<UniversityDashboard['students']>;

const MALE_COLOR = '#5b6bff';
const FEMALE_COLOR = '#a78bfa';
const OTHER_COLOR = '#22d3ee';

function genderGradient(male: number, female: number, other: number): string {
  const total = male + female + other;
  if (total <= 0) return 'conic-gradient(from -90deg, rgba(148, 163, 255, 0.16), rgba(148, 163, 255, 0.16))';
  const maleShare = (male / total) * 100;
  const femaleShare = (female / total) * 100;
  const femaleEnd = maleShare + femaleShare;
  return `conic-gradient(from -90deg, ${MALE_COLOR} 0% ${maleShare}%, ${FEMALE_COLOR} ${maleShare}% ${femaleEnd}%, ${OTHER_COLOR} ${femaleEnd}% 100%)`;
}

function GenderLegend({
  items,
  total,
}: {
  items: { label: string; value: number; color: string }[];
  total: number;
}) {
  return (
    <ul className="udash-enrollment__legend">
      {items.map((item) => (
        <li key={item.label} className="udash-enrollment__legend-row">
          <span className="udash-dot" style={{ background: item.color }} />
          <span className="udash-enrollment__legend-label">{item.label}</span>
          <span className="udash-enrollment__legend-value">
            {item.value}
            <small>{sharePercentage(item.value, total)}%</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

function ClassBars({ items }: { items: UniversityNameCount[] }) {
  if (items.length === 0) return <p className="udash-empty">No class distribution data.</p>;
  const peak = Math.max(1, ...items.map((item) => item.count));
  return (
    <ol className="udash-enrollment__classes">
      {items.map((item, index) => (
        <li key={item.id ?? item.name} className="udash-enrollment__class">
          <span className="udash-enrollment__rank">{index + 1}</span>
          <span className="udash-enrollment__class-name" title={item.name}>
            {item.name}
          </span>
          <span className="udash-enrollment__class-track">
            <span
              className="udash-enrollment__class-fill"
              style={{ width: `${(item.count / peak) * 100}%` }}
            />
          </span>
          <span className="udash-enrollment__class-count">{item.count}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A redesigned, unique "Student enrollment" panel for the university dashboard:
 * a gender ring, an active-student rate and a ranked class-distribution chart.
 */
export function StudentEnrollmentPanel({ students }: { students: StudentEnrollment }) {
  const other = Math.max(0, students.total - students.male - students.female);
  const activeRate = sharePercentage(students.active, students.total);
  const classCount = students.byClass.length;

  return (
    <section className="udash-enrollment">
      <header className="udash-enrollment__head">
        <div className="udash-enrollment__intro">
          <p className="udash-enrollment__eyebrow">
            <Icon name="students" size={14} />
            Enrollment
          </p>
          <h2 className="udash-enrollment__title">Student enrollment</h2>
          <p className="udash-enrollment__subtitle">
            {students.total} students across {classCount} {classCount === 1 ? 'class' : 'classes'}
          </p>
        </div>
        <div className="udash-enrollment__rate">
          <span className="udash-enrollment__rate-value">{activeRate}%</span>
          <span className="udash-enrollment__rate-label">
            active · {students.active}/{students.total}
          </span>
        </div>
      </header>

      <div className="udash-enrollment__body">
        <div className="udash-enrollment__gender">
          <div
            className="udash-enrollment__ring"
            style={{ background: genderGradient(students.male, students.female, other) }}
          >
            <div className="udash-enrollment__hole">
              <span className="udash-enrollment__hole-value">{students.total}</span>
              <small>students</small>
            </div>
          </div>
          <GenderLegend
            total={students.total}
            items={[
              { label: 'Male', value: students.male, color: MALE_COLOR },
              { label: 'Female', value: students.female, color: FEMALE_COLOR },
              { label: 'Other', value: other, color: OTHER_COLOR },
            ]}
          />
        </div>

        <div className="udash-enrollment__classes-col">
          <h3 className="udash-subtitle">Class distribution</h3>
          <ClassBars items={students.byClass} />
        </div>
      </div>
    </section>
  );
}
