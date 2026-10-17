import { Pressable, Text, View } from 'react-native';
import { Linking } from 'react-native';

import { ParentChildShell } from '../../components/ParentChildShell';
import { formatDate, humanize } from '../../lib/format';

interface HomeworkAttachment {
  id: string;
  name: string;
  url: string;
}

interface HomeworkSubmission {
  status: string;
  submittedAt: string | null;
  remarks: string | null;
}

interface ChildHomework {
  id: string;
  title: string;
  description: string | null;
  materials: string | null;
  assignedDate: string;
  dueDate: string;
  subject?: { id?: string; name?: string | null } | null;
  teacher?: { id?: string; name?: string | null } | null;
  attachments: HomeworkAttachment[];
  submission: HomeworkSubmission | null;
}

export function ParentHomeworkScreen() {
  return (
    <ParentChildShell<ChildHomework[]>
      title="Homework"
      subtitle="Assignments set for your child's section"
      endpoint={(studentId) => `/parents/me/children/${studentId}/homework`}
      emptyMessage="No homework has been assigned yet."
      isEmpty={(data) => data.length === 0}
      render={(data) => (
        <View style={styles.grid}>
          {data.map((item, index) => (
            <HomeworkCard key={item.id ?? index} item={item} />
          ))}
        </View>
      )}
    />
  );
}

function submissionTone(status: string | undefined): string {
  switch (status) {
    case 'SUBMITTED':
      return '#0284c7';
    case 'LATE':
      return '#dc2626';
    case 'GRADED':
      return '#16a34a';
    default:
      return '#b45309';
  }
}

function HomeworkCard({ item }: { item: ChildHomework }) {
  const status = item.submission ? humanize(item.submission.status) : 'Not submitted';
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={[styles.badge, { color: submissionTone(item.submission?.status) }]}>
          {status}
        </Text>
      </View>
      <Text style={styles.muted}>
        {[item.subject?.name, item.teacher?.name].filter(Boolean).join(' · ') || 'No subject'}
      </Text>
      <Text style={styles.muted}>
        Assigned {formatDate(item.assignedDate)} · Due {formatDate(item.dueDate)}
      </Text>
      {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
      {item.materials ? <Text style={styles.muted}>{item.materials}</Text> : null}
      {item.attachments.length > 0 ? (
        <View style={styles.attachments}>
          {item.attachments.map((attachment) => (
            <Pressable
              key={attachment.id}
              onPress={() => void Linking.openURL(attachment.url).catch(() => undefined)}
            >
              <Text style={styles.attachment}>{attachment.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = {
  grid: {
    gap: 12,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    color: '#334155',
  },
  muted: {
    fontSize: 13,
    color: '#64748b',
  },
  attachments: {
    gap: 2,
  },
  attachment: {
    fontSize: 13,
    color: '#1d4ed8',
    textDecorationLine: 'underline',
  },
} as const;
