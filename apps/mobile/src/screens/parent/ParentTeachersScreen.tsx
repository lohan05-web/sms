import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '../../components/Icon';
import {
  ParentButton,
  ParentEmpty,
  ParentError,
  ParentHeader,
  ParentNotice,
  ParentPage,
  ParentPanel,
  ParentSelectChip,
} from '../../components/parent/parentUi';
import { SkeletonPanels } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import { initials } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { colors, parentColors, radius } from '../../theme';

interface ChildTeacher {
  id: string;
  teacherId: string;
  name: string | null;
  subject: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
}

interface ChildRow {
  id: string;
  name: string | null;
  className: string | null;
  sectionName: string | null;
  teachers: ChildTeacher[];
}

interface ParentOverview {
  children: ChildRow[];
}

function childLabel(child: ChildRow): string {
  return (
    [child.name, child.className, child.sectionName].filter(Boolean).join(' · ') || 'Student'
  );
}

function teacherInitials(name: string | null): string {
  if (!name) return '?';
  const [first, ...rest] = name.split(' ');
  return initials(first, rest.join(' ')) || '?';
}

export function ParentTeachersScreen() {
  const [selectedId, setSelectedId] = useState('');
  const [composeFor, setComposeFor] = useState<ChildTeacher | null>(null);

  const state = useAsync<ParentOverview>(() => api.get<ParentOverview>('/parents/me/children'), []);

  if (state.loading) {
    return (
      <ParentPage>
        <ParentHeader title="Teachers" subtitle="The teachers assigned to your child's class" />
        <SkeletonPanels count={1} />
      </ParentPage>
    );
  }
  if (state.forbidden) {
    return (
      <ParentPage>
        <ParentHeader title="Teachers" />
        <ParentEmpty icon="lock" message="Your account cannot view this page." />
      </ParentPage>
    );
  }
  if (state.error) {
    return (
      <ParentPage>
        <ParentHeader title="Teachers" />
        <ParentError message={state.error} onRetry={state.reload} />
      </ParentPage>
    );
  }

  const children = state.data?.children ?? [];
  const child = children.find((item) => item.id === selectedId) ?? children[0] ?? null;

  if (!child) {
    return (
      <ParentPage>
        <ParentHeader title="Teachers" />
        <ParentEmpty
          icon="teacher"
          message="No children are linked to your account yet."
          hint="Please contact the school office to link your children."
        />
      </ParentPage>
    );
  }

  return (
    <ParentPage>
      <ParentHeader title="Teachers" subtitle="The teachers assigned to your child's class" icon="teacher" />

      {children.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {children.map((item) => (
            <ParentSelectChip
              key={item.id}
              label={childLabel(item)}
              active={item.id === child.id}
              onPress={() => {
                setSelectedId(item.id);
                setComposeFor(null);
              }}
            />
          ))}
        </View>
      ) : null}

      {composeFor ? (
        <ComposePanel
          childId={child.id}
          teacher={composeFor}
          onClose={() => setComposeFor(null)}
        />
      ) : null}

      {child.teachers.length === 0 ? (
        <ParentEmpty icon="teacher" message="No teachers have been assigned yet." />
      ) : (
        <View style={{ gap: 10 }}>
          {child.teachers.map((teacher) => (
            <View key={teacher.id} style={styles.teacherCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{teacherInitials(teacher.name)}</Text>
              </View>
              <View style={styles.teacherInfo}>
                <Text style={styles.teacherName} numberOfLines={1}>
                  {teacher.name ?? 'Teacher'}
                </Text>
                <Text style={styles.teacherSubject} numberOfLines={1}>
                  {teacher.subject}
                </Text>
                {teacher.contact ? (
                  <Text style={styles.teacherContact} numberOfLines={1}>
                    {teacher.contact}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Message ${teacher.name ?? 'teacher'}`}
                onPress={() => setComposeFor(teacher)}
                style={({ pressed }) => [styles.messageButton, pressed ? styles.pressed : null]}
              >
                <Icon name="messages" size={15} color={parentColors.accent} />
                <Text style={styles.messageButtonLabel}>Message</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ParentPage>
  );
}

/**
 * Compose form for a parent to start a conversation with one of their child's
 * teachers. Posts to `/conversations/teachers`, which re-derives the
 * child → section → teacher relationship on the server.
 */
function ComposePanel({
  childId,
  teacher,
  onClose,
}: {
  childId: string;
  teacher: ChildTeacher;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError(null);
    if (!subject.trim() || !body.trim()) {
      setError('Please add a subject and a message.');
      return;
    }
    setSending(true);
    try {
      await api.post('/conversations/teachers', {
        studentId: childId,
        teacherId: teacher.teacherId,
        subject: subject.trim(),
        body: body.trim(),
      });
      setSubject('');
      setBody('');
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send your message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <ParentPanel
      title={`Message ${teacher.name ?? 'teacher'}`}
      subtitle={teacher.subject}
      icon="messages"
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close compose"
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
        >
          <Icon name="close" size={16} color={colors.textMuted} />
        </Pressable>
      }
    >
      {sent ? (
        <ParentNotice
          tone="success"
          icon="check"
          message="Your message was sent. The teacher's reply appears under Messages."
        />
      ) : (
        <>
          {error ? <ParentNotice tone="danger" icon="alert" message={error} /> : null}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g. Question about homework"
              placeholderTextColor={colors.textFaint}
              maxLength={150}
              accessibilityLabel="Subject"
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write your message to the teacher"
              placeholderTextColor={colors.textFaint}
              maxLength={5000}
              multiline
              accessibilityLabel="Message"
              style={[styles.input, styles.inputMultiline]}
            />
          </View>
          <View style={styles.rowActions}>
            <ParentButton label="Cancel" variant="ghost" onPress={onClose} disabled={sending} />
            <ParentButton
              label={sending ? 'Sending…' : 'Send'}
              icon="arrow-right"
              onPress={() => void submit()}
              disabled={sending}
            />
          </View>
        </>
      )}
    </ParentPanel>
  );
}

const styles = {
  teacherCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: parentColors.accentSoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: parentColors.accent,
  },
  teacherInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  teacherName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
  },
  teacherSubject: {
    fontSize: 13,
    color: colors.textMuted,
  },
  teacherContact: {
    fontSize: 12,
    color: colors.textFaint,
  },
  messageButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: parentColors.accentBorder,
    backgroundColor: parentColors.accentSoft,
  },
  messageButtonLabel: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: parentColors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.surfaceMuted,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.textMuted,
  },
  input: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top' as const,
  },
  rowActions: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: 10,
  },
} as const;
