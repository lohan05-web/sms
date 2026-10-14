import { useState } from 'react';
import { ErrorState, PageHeader, Spinner } from '../components/ui';
import { Pagination } from '../components/Pagination';
import { useRealtime } from '../components/RealtimeProvider';
import { api } from '../lib/api';
import { formatDateTime, humanize } from '../lib/format';
import { connectionLabel } from '../lib/realtime';
import { useAsync } from '../lib/useAsync';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResult {
  items: NotificationItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  unread: number;
}

const PAGE_LIMIT = 20;

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { version, status, refreshUnread } = useRealtime();

  const state = useAsync<NotificationsResult>(async () => {
    const [list, count] = await Promise.all([
      api.list<NotificationItem>('/notifications', {
        page,
        limit: PAGE_LIMIT,
        unreadOnly: unreadOnly ? 'true' : undefined,
      }),
      api.get<{ count: number }>('/notifications/unread-count'),
    ]);
    return { items: list.items, meta: list.meta, unread: count.count };
  }, [page, unreadOnly, version]);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      state.reload();
      void refreshUnread();
    } finally {
      setBusyId(null);
    }
  };

  const markRead = (id: string) => {
    setBusyId(id);
    void run(() => api.patch(`/notifications/${id}/read`));
  };

  const remove = (id: string) => {
    setBusyId(id);
    void run(() => api.delete(`/notifications/${id}`));
  };

  const markAllRead = () => {
    setBusyId('all');
    void run(() => api.patch('/notifications/read-all'));
  };

  return (
    <div className="page">
      <PageHeader
        title="Notifications"
        subtitle={state.data ? `${state.data.unread} unread` : 'Your inbox'}
        actions={
          <div className="toolbar toolbar--inline">
            <span className={`live live--${status}`} title="Realtime connection">
              {connectionLabel(status)}
            </span>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(event) => {
                  setPage(1);
                  setUnreadOnly(event.target.checked);
                }}
              />
              Unread only
            </label>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={markAllRead}
              disabled={busyId === 'all' || (state.data?.unread ?? 0) === 0}
            >
              Mark all read
            </button>
          </div>
        }
      />

      {state.loading ? (
        <Spinner label="Loading notifications…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <>
          {state.data.items.length === 0 ? (
            <div className="state state--empty">You have no notifications.</div>
          ) : (
            <ul className="notifications">
              {state.data.items.map((item) => (
                <li
                  key={item.id}
                  className={`notification${item.isRead ? '' : ' notification--unread'}`}
                >
                  <div className="notification__main">
                    <div className="notification__head">
                      <span className="badge badge--default">{humanize(item.type)}</span>
                      <span className="notification__time">{formatDateTime(item.createdAt)}</span>
                    </div>
                    <h3 className="notification__title">{item.title}</h3>
                    {item.body ? <p className="notification__body">{item.body}</p> : null}
                  </div>
                  <div className="notification__actions">
                    {!item.isRead ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => markRead(item.id)}
                        disabled={busyId === item.id}
                      >
                        Mark read
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => remove(item.id)}
                      disabled={busyId === item.id}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={state.data.meta.page}
            totalPages={state.data.meta.totalPages}
            total={state.data.meta.total}
            onChange={setPage}
          />
        </>
      ) : null}
    </div>
  );
}
