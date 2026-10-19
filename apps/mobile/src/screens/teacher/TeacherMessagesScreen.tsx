import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ChoiceField } from '../../components/teacher/teacherForm';
import {
  Chip,
  TeacherButton,
  TeacherEmpty,
  TeacherNotice,
  TeacherPage,
  TeacherPanel,
} from '../../components/teacher/teacherUi';
import { ErrorState, SkeletonPanels } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDateTime } from '../../lib/format';
import {
  emptyPage,
  fetchAllPages,
  fetchStudentsForSections,
  studentNameOf,
  useTeacherScope,
  type PageFetch,
  type TeacherStudent,
} from '../../lib/teacherScope';
import { useAsync } from '../../lib/useAsync';
import { colors, radius } from '../../theme';

/**
 * Teacher ↔ student messaging.
 *
 * Two capabilities, both backed by real endpoints:
 *
 *  - Reading and replying: the teacher participates in conversations
 *    (`MESSAGE_READ`), so the inbox and thread reuse `GET /conversations`,
 *    `GET /conversations/:id/messages` and `POST /conversations/:id/messages`.
 *  - Starting a conversation: teachers do NOT hold `MESSAGE_MANAGE`, which the
 *    generic `POST /conversations` requires and which would otherwise let them
 *    target any user in the school. A teacher-scoped endpoint
 *    (`POST /conversations/students`) is used instead; it derives the teacher's
 *    sections from the session and refuses students outside them.
 *
 * Read status comes from each participant's `lastReadAt`, so the UI only ever
 * reports what the backend actually stored.
 */

interface Participant {
  id: string;
  userId: string;
  lastReadAt: string | null;
  user?: { id: string; firstName?: string; lastName?: string; role?: string } | null;
}

interface Conversation {
  id: string;
  subject: string;
  createdById: string;
  participants: Participant[];
  lastMessage: { id: string; body: string; createdAt: string; senderId: string } | null;
  messageCount: number;
  unreadCount: number;
  lastMessageAt?: string | null;
}

interface ThreadMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender?: { id: string; firstName?: string; lastName?: string } | null;
}

function nameOfParticipant(participant: Participant): string {
  const name = `${participant.user?.firstName ?? ''} ${participant.user?.lastName ?? ''}`.trim();
  return name || 'Student';
}

function recipientsOf(conversation: Conversation, selfId: string): Participant[] {
  return conversation.participants.filter((participant) => participant.userId !== selfId);
}

/** "Read by 2 of 4" derived from participant `lastReadAt` versus the last message. */
function readSummary(conversation: Conversation, selfId: string): string {
  const others = recipientsOf(conversation, selfId);
  if (others.length === 0) return 'No other participants';
  const last = conversation.lastMessage;
  if (!last) return `Delivered to ${others.length}`;
  const sentAt = new Date(last.createdAt).getTime();
  const read = others.filter(
    (participant) => participant.lastReadAt && new Date(participant.lastReadAt).getTime() >= sentAt,
  ).length;
  return `Delivered to ${others.length} · read by ${read}`;
}

export function TeacherMessagesScreen() {
  const { user } = useAuth();
  const selfId = user?.id ?? '';
  const { scope, loading, error, forbidden, reload } = useTeacherScope();

  const conversations = useAsync<PageFetch<Conversation>>(
    () => fetchAllPages<Conversation>('/conversations'),
    [selfId],
  );
  const students = useAsync<PageFetch<TeacherStudent>>(
    () => (scope ? fetchStudentsForSections(scope.sectionIds) : Promise.resolve(emptyPage())),
    [scope?.teacher.id],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Compose state.
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<'section' | 'students'>('section');
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [studentIds, setStudentIds] = useState<string[]>([]);

  const thread = useAsync<Conversation | null>(
    () => (selectedId ? api.get<Conversation>(`/conversations/${selectedId}`) : Promise.resolve(null)),
    [selectedId],
  );
  const messages = useAsync<PageFetch<ThreadMessage>>(
    () =>
      selectedId
        ? fetchAllPages<ThreadMessage>(`/conversations/${selectedId}/messages`)
        : Promise.resolve(emptyPage()),
    [selectedId],
  );

  /** Sections the teacher can message, derived from their own students. */
  const sections = useMemo(() => {
    const map = new Map<string, { id: string; label: string; students: TeacherStudent[] }>();
    for (const student of students.data?.items ?? []) {
      const sectionId = student.section?.id;
      if (!sectionId) continue;
      const entry = map.get(sectionId) ?? {
        id: sectionId,
        label:
          [student.section?.classLevel?.name, student.section?.name].filter(Boolean).join(' · ') ||
          'Section',
        students: [],
      };
      entry.students.push(student);
      map.set(sectionId, entry);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [students.data]);

  const allStudents = useMemo(
    () =>
      [...(students.data?.items ?? [])].sort((a, b) => studentNameOf(a).localeCompare(studentNameOf(b))),
    [students.data],
  );

  const recipientCount = useMemo(() => {
    if (mode === 'section') {
      return sections
        .filter((section) => sectionIds.includes(section.id))
        .reduce((total, section) => total + section.students.length, 0);
    }
    return studentIds.length;
  }, [mode, sections, sectionIds, studentIds]);

  const openConversation = (id: string) => {
    setSelectedId(id);
    setReplyBody('');
    setActionError(null);
    setFlash(null);
    void api.patch(`/conversations/${id}/read`).catch(() => undefined);
  };

  const closeConversation = () => {
    setSelectedId(null);
    setReplyBody('');
    setActionError(null);
  };

  const toggle = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const resetCompose = () => {
    setSubject('');
    setBody('');
    setMode('section');
    setSectionIds([]);
    setStudentIds([]);
  };

  const submitCompose = async () => {
    setActionError(null);
    setFlash(null);
    if (!subject.trim()) {
      setActionError('A subject is required.');
      return;
    }
    if (!body.trim()) {
      setActionError('Write a message body first.');
      return;
    }
    if (recipientCount === 0) {
      setActionError('Choose at least one class or student.');
      return;
    }
    setSending(true);
    try {
      const created = await api.post<Conversation>('/conversations/students', {
        subject: subject.trim(),
        body: body.trim(),
        ...(mode === 'section' ? { sectionIds } : { studentIds }),
      });
      const delivered = recipientsOf(created, selfId).length;
      resetCompose();
      setComposing(false);
      conversations.reload();
      setSelectedId(created.id);
      setFlash(
        `Message sent to ${delivered} student${delivered === 1 ? '' : 's'}. Delivery is confirmed by the server; read status appears as students open it.`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const sendReply = async () => {
    if (!selectedId || !replyBody.trim()) return;
    setSending(true);
    setActionError(null);
    try {
      await api.post(`/conversations/${selectedId}/messages`, { body: replyBody.trim() });
      setReplyBody('');
      thread.reload();
      messages.reload();
      conversations.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The reply could not be sent.');
    } finally {
      setSending(false);
    }
  };

  if (forbidden) return <TeacherEmpty message="Only teachers can open this page." icon="lock" />;
  if (loading || conversations.loading) return <SkeletonPanels count={3} />;
  if (error || conversations.error) {
    return (
      <ErrorState
        message={error ?? conversations.error ?? ''}
        onRetry={() => {
          reload();
          conversations.reload();
        }}
      />
    );
  }

  /* ------------------------------------------------------------------ thread */
  if (selectedId) {
    const conversation = thread.data;
    const items = messages.data?.items ?? [];
    return (
      <TeacherPage>
        <TeacherPanel
          title={conversation?.subject ?? 'Conversation'}
          subtitle={conversation ? readSummary(conversation, selfId) : undefined}
          icon="messages"
          action={<TeacherButton label="Back" icon="chevron-left" variant="ghost" onPress={closeConversation} />}
        >
          {flash ? <TeacherNotice tone="success" icon="check" message={flash} /> : null}
          {actionError ? <TeacherNotice tone="danger" icon="alert" message={actionError} /> : null}
          {messages.loading ? (
            <Text style={styles.muted}>Loading messages…</Text>
          ) : items.length === 0 ? (
            <TeacherEmpty message="No messages in this conversation yet." icon="messages" />
          ) : (
            <ScrollView style={styles.thread} nestedScrollEnabled>
              <View style={styles.threadInner}>
                {items.map((message) => {
                  const mine = message.senderId === selfId;
                  return (
                    <View key={message.id} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                      {!mine ? (
                        <Text style={styles.bubbleAuthor}>
                          {message.sender
                            ? `${message.sender.firstName ?? ''} ${message.sender.lastName ?? ''}`.trim() ||
                              'Student'
                            : 'Student'}
                        </Text>
                      ) : null}
                      <Text style={styles.bubbleBody}>{message.body}</Text>
                      <Text style={styles.bubbleTime}>{formatDateTime(message.createdAt)}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          <View style={styles.replyRow}>
            <TextInput
              style={styles.replyInput}
              value={replyBody}
              onChangeText={setReplyBody}
              placeholder="Write a reply…"
              placeholderTextColor={colors.textFaint}
              multiline
              accessibilityLabel="Reply message"
            />
            <TeacherButton
              label={sending ? 'Sending…' : 'Send'}
              onPress={() => void sendReply()}
              disabled={sending || !replyBody.trim()}
            />
          </View>
        </TeacherPanel>
      </TeacherPage>
    );
  }

  /* ------------------------------------------------------------ inbox + compose */
  const items = conversations.data?.items ?? [];

  return (
    <TeacherPage>
      {flash ? <TeacherNotice tone="success" icon="check" message={flash} /> : null}
      {actionError ? <TeacherNotice tone="danger" icon="alert" message={actionError} /> : null}

      <TeacherPanel
        title="Messages"
        subtitle="Your conversations with students"
        icon="messages"
        action={
          composing ? (
            <TeacherButton
              label="Cancel"
              variant="ghost"
              onPress={() => {
                setComposing(false);
                resetCompose();
                setActionError(null);
              }}
            />
          ) : (
            <TeacherButton label="New message" icon="plus" variant="ghost" onPress={() => setComposing(true)} />
          )
        }
      >
        {conversations.data?.truncated ? (
          <TeacherNotice
            tone="warning"
            icon="alert"
            message={`Only the first ${conversations.data.items.length} of ${conversations.data.total} conversations could be loaded.`}
          />
        ) : null}

        {composing ? (
          <View style={styles.compose}>
            <Text style={styles.modeLabel}>Send to</Text>
            <ChoiceField
              label="Recipients"
              value={mode}
              onChange={(value) => setMode(value)}
              options={[
                { value: 'section', label: 'Whole class (section)' },
                { value: 'students', label: 'Individual students' },
              ]}
            />

            {mode === 'section' ? (
              sections.length === 0 ? (
                <Text style={styles.muted}>No students are assigned to your sections yet.</Text>
              ) : (
                <View style={styles.pickerList}>
                  {sections.map((section) => {
                    const active = sectionIds.includes(section.id);
                    return (
                      <Pressable
                        key={section.id}
                        onPress={() => setSectionIds((prev) => toggle(prev, section.id))}
                        style={[styles.pickerRow, active ? styles.pickerRowActive : null]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: active }}
                        accessibilityLabel={`${section.label}, ${section.students.length} students`}
                      >
                        <View style={styles.pickerCheck}>
                          <Text style={styles.pickerCheckText}>{active ? '✓' : ''}</Text>
                        </View>
                        <View style={styles.pickerBody}>
                          <Text style={styles.pickerTitle}>{section.label}</Text>
                          <Text style={styles.pickerMeta}>
                            {section.students.length} student{section.students.length === 1 ? '' : 's'}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )
            ) : allStudents.length === 0 ? (
              <Text style={styles.muted}>No students are assigned to your sections yet.</Text>
            ) : (
              <ScrollView style={styles.studentScroll} nestedScrollEnabled>
                <View style={styles.pickerList}>
                  {allStudents.map((student) => {
                    const active = studentIds.includes(student.id);
                    return (
                      <Pressable
                        key={student.id}
                        onPress={() => setStudentIds((prev) => toggle(prev, student.id))}
                        style={[styles.pickerRow, active ? styles.pickerRowActive : null]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: active }}
                        accessibilityLabel={studentNameOf(student)}
                      >
                        <View style={styles.pickerCheck}>
                          <Text style={styles.pickerCheckText}>{active ? '✓' : ''}</Text>
                        </View>
                        <View style={styles.pickerBody}>
                          <Text style={styles.pickerTitle}>{studentNameOf(student)}</Text>
                          <Text style={styles.pickerMeta}>
                            {[student.section?.classLevel?.name, student.section?.name]
                              .filter(Boolean)
                              .join(' · ') || student.admissionNo}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g. Homework reminder"
              placeholderTextColor={colors.textFaint}
              maxLength={150}
              accessibilityLabel="Message subject"
            />
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={body}
              onChangeText={setBody}
              placeholder="Write your announcement…"
              placeholderTextColor={colors.textFaint}
              maxLength={5000}
              multiline
              accessibilityLabel="Message body"
            />

            <Text style={styles.muted}>
              {recipientCount > 0
                ? `${recipientCount} recipient${recipientCount === 1 ? '' : 's'} selected`
                : 'Select recipients above'}
            </Text>

            <TeacherButton
              label={sending ? 'Sending…' : 'Send message'}
              icon="arrow-right"
              onPress={() => void submitCompose()}
              disabled={sending}
            />
          </View>
        ) : items.length === 0 ? (
          <TeacherEmpty
            message="No conversations yet."
            hint="Use New message to write to a class or an individual student — replies appear here."
            icon="messages"
          />
        ) : (
          <View style={styles.list}>
            {items.map((conversation) => {
              const others = recipientsOf(conversation, selfId);
              return (
                <Pressable
                  key={conversation.id}
                  onPress={() => openConversation(conversation.id)}
                  style={styles.conversation}
                  accessibilityRole="button"
                  accessibilityLabel={conversation.subject}
                >
                  <View style={styles.conversationHead}>
                    <Text style={styles.conversationSubject} numberOfLines={1}>
                      {conversation.subject}
                    </Text>
                    {conversation.unreadCount > 0 ? (
                      <Chip label={`${conversation.unreadCount} new`} tone="danger" />
                    ) : (
                      <Chip label={`${others.length}`} tone="default" />
                    )}
                  </View>
                  <Text style={styles.conversationMeta} numberOfLines={1}>
                    {others
                      .map(nameOfParticipant)
                      .slice(0, 3)
                      .join(', ')}
                    {others.length > 3 ? ` +${others.length - 3}` : ''}
                  </Text>
                  {conversation.lastMessage ? (
                    <Text style={styles.conversationPreview} numberOfLines={2}>
                      {conversation.lastMessage.body}
                    </Text>
                  ) : null}
                  <Text style={styles.conversationTime}>
                    {conversation.lastMessageAt ? formatDateTime(conversation.lastMessageAt) : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </TeacherPanel>
    </TeacherPage>
  );
}

const styles = {
  list: {
    gap: 10,
  },
  conversation: {
    gap: 4,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  conversationHead: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  conversationSubject: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700' as const,
    color: colors.text,
  },
  conversationMeta: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.primaryDark,
  },
  conversationPreview: {
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textMuted,
  },
  conversationTime: {
    fontSize: 11,
    color: colors.textFaint,
  },
  thread: {
    maxHeight: 380,
  },
  threadInner: {
    gap: 8,
    paddingVertical: 4,
  },
  bubble: {
    maxWidth: '86%',
    padding: 10,
    borderRadius: radius.md,
    gap: 3,
  },
  bubbleMine: {
    alignSelf: 'flex-end' as const,
    backgroundColor: colors.primarySoft,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start' as const,
    backgroundColor: colors.surfaceMuted,
  },
  bubbleAuthor: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.primaryDark,
  },
  bubbleBody: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text,
  },
  bubbleTime: {
    fontSize: 10,
    color: colors.textFaint,
    alignSelf: 'flex-end' as const,
  },
  replyRow: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
    textAlignVertical: 'top' as const,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  compose: {
    gap: 12,
  },
  modeLabel: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.textMuted,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputMultiline: {
    minHeight: 84,
    textAlignVertical: 'top' as const,
  },
  pickerList: {
    gap: 8,
  },
  studentScroll: {
    maxHeight: 260,
  },
  pickerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickerRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pickerCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.surface,
  },
  pickerCheckText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: colors.primary,
  },
  pickerBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  pickerTitle: {
    fontSize: 13.5,
    fontWeight: '700' as const,
    color: colors.text,
  },
  pickerMeta: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  muted: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
} as const;
