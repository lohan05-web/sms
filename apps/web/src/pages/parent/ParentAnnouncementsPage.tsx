import { EmptyState, ErrorState, PageHeader, SkeletonPanels } from '../../components/ui';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';

interface Notice {
  id: string;
  title: string;
  body: string;
  audience?: unknown;
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
}

export function ParentAnnouncementsPage() {
  const state = useAsync<Notice[]>(
    () => api.list<Notice>('/notices', { limit: 30 }).then((page) => page.items),
    [],
  );

  return (
    <div className="page">
      <PageHeader
        title="Announcements"
        subtitle="Notices and circulars published by the school"
        icon="bell"
      />

      <section className="panel">
        {state.loading ? (
          <SkeletonPanels count={2} />
        ) : state.forbidden ? (
          <EmptyState
            icon="lock"
            message="You do not have access to school announcements."
          />
        ) : state.error ? (
          <ErrorState message={state.error} onRetry={state.reload} />
        ) : (state.data?.length ?? 0) === 0 ? (
          <EmptyState icon="bell" message="No announcements have been published yet." />
        ) : (
          <div className="parent-list">
            {state.data?.map((notice) => (
              <article className="parent-row" key={notice.id}>
                <div className="parent-row__main">
                  <div className="parent-row__title">
                    {notice.isPinned ? <span className="badge badge--info">Pinned</span> : null}{' '}
                    {notice.title}
                  </div>
                  <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{notice.body}</p>
                  <div className="parent-row__meta">
                    Published {formatDateTime(notice.publishedAt)}
                    {notice.expiresAt ? ` · Expires ${formatDateTime(notice.expiresAt)}` : ''}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
