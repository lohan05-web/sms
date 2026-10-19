import { Text, View } from 'react-native';

import {
  ParentChip,
  ParentEmpty,
  ParentError,
  ParentHeader,
  ParentPage,
} from '../../components/parent/parentUi';
import { SkeletonPanels } from '../../components/ui';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { colors, radius } from '../../theme';

interface NoticeRow {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  publishedAt: string;
  expiresAt?: string | null;
}

export function ParentNoticesScreen() {
  const state = useAsync<NoticeRow[]>(
    () => api.list<NoticeRow>('/notices', { page: 1, limit: 30 }).then((page) => page.items),
    [],
  );

  if (state.loading) {
    return (
      <ParentPage>
        <ParentHeader title="Announcements" subtitle="Notices published by the school" />
        <SkeletonPanels count={2} />
      </ParentPage>
    );
  }
  if (state.forbidden) {
    return (
      <ParentPage>
        <ParentHeader title="Announcements" />
        <ParentEmpty icon="lock" message="Your account cannot view school announcements." />
      </ParentPage>
    );
  }
  if (state.error) {
    return (
      <ParentPage>
        <ParentHeader title="Announcements" />
        <ParentError message={state.error} onRetry={state.reload} />
      </ParentPage>
    );
  }

  const notices = state.data ?? [];

  return (
    <ParentPage>
      <ParentHeader
        title="Announcements"
        subtitle="Notices and circulars published by the school"
        icon="bell"
      />

      {notices.length === 0 ? (
        <ParentEmpty icon="bell" message="No announcements have been published yet." />
      ) : (
        <View style={{ gap: 10 }}>
          {state.data?.map((notice) => (
            <View key={notice.id} style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title} numberOfLines={2}>
                  {notice.title}
                </Text>
                {notice.isPinned ? <ParentChip label="Pinned" tone="info" /> : null}
              </View>
              <Text style={styles.body}>{notice.body}</Text>
              <Text style={styles.meta}>
                Published {formatDateTime(notice.publishedAt)}
                {notice.expiresAt ? ` · Expires ${formatDateTime(notice.expiresAt)}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ParentPage>
  );
}

const styles = {
  card: {
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
  },
  body: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.textFaint,
  },
} as const;
