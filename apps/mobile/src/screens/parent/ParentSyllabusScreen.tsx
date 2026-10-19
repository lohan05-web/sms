import { Text, View } from 'react-native';

import { ParentChildShell } from '../../components/ParentChildShell';
import {
  ParentChip,
  ParentEmpty,
  ParentPanel,
  ParentRow,
  type ParentChipTone,
} from '../../components/parent/parentUi';
import { formatDate, humanize } from '../../lib/format';

interface SyllabusUnit {
  id: string;
  title: string;
  description: string | null;
  upcomingTopic: string | null;
  status: string;
  completedAt: string | null;
  subject?: { id?: string; name?: string | null } | null;
}

function statusTone(status: string): ParentChipTone {
  if (status === 'COMPLETED') return 'success';
  if (status === 'IN_PROGRESS') return 'warning';
  return 'default';
}

interface SubjectGroup {
  key: string;
  name: string;
  units: SyllabusUnit[];
}

function groupBySubject(units: SyllabusUnit[]): SubjectGroup[] {
  const groups = new Map<string, SubjectGroup>();
  for (const unit of units) {
    const key = unit.subject?.id ?? unit.subject?.name ?? 'other';
    const group = groups.get(key) ?? { key, name: unit.subject?.name ?? 'General', units: [] };
    group.units.push(unit);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function ParentSyllabusScreen() {
  return (
    <ParentChildShell<SyllabusUnit[]>
      title="Syllabus"
      subtitle="What the class is covering, subject by subject"
      endpoint={(studentId) => `/parents/me/children/${studentId}/syllabus`}
      emptyMessage="No syllabus has been published for this class yet."
      isEmpty={(data) => data.length === 0}
      render={(data) => {
        const groups = groupBySubject(data);
        return (
          <>
            {groups.map((group) => {
              const completed = group.units.filter((unit) => unit.status === 'COMPLETED').length;
              const percent = group.units.length
                ? Math.round((completed / group.units.length) * 100)
                : 0;
              return (
                <ParentPanel
                  key={group.key}
                  title={group.name}
                  subtitle={`${completed} of ${group.units.length} units · ${percent}%`}
                  icon="subject"
                >
                  <View style={{ gap: 8 }}>
                    {group.units.map((unit, index) => (
                      <ParentRow
                        key={unit.id}
                        title={`${index + 1}. ${unit.title}`}
                        meta={
                          [
                            unit.description,
                            unit.status !== 'COMPLETED' && unit.upcomingTopic
                              ? `Next: ${unit.upcomingTopic}`
                              : null,
                            unit.completedAt ? `Completed ${formatDate(unit.completedAt)}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || undefined
                        }
                        aside={<ParentChip label={humanize(unit.status)} tone={statusTone(unit.status)} />}
                      />
                    ))}
                  </View>
                </ParentPanel>
              );
            })}
            {groups.length === 0 ? (
              <ParentEmpty message="No syllabus has been published for this class yet." />
            ) : null}
            <Text style={styles.footnote}>
              Notes and attachments set by the teacher appear under Homework.
            </Text>
          </>
        );
      }}
    />
  );
}

const styles = {
  footnote: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center' as const,
  },
} as const;
