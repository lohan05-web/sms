import { Permission, createConversationSchema } from '@smartschool/shared';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FormDialog } from '../components/FormDialog';
import { Pagination } from '../components/Pagination';
import { useRealtime } from '../components/RealtimeProvider';
import { ErrorState, PageHeader, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { initialFromFields, type FieldDef } from '../lib/form';
import { formatDateTime } from '../lib/format';
import {
  ROLE_RECIPIENT_OPTIONS,
  conversationTitle,
  displayName,
  isMine,
  participantsSummary,
  truncate,
  unreadBadge,
  type ConversationMessage,
  type ConversationSummary,
} from '../lib/messages';
import { can } from '../lib/permissions';
import { connectionLabel } from '../lib/realtime';
import { useAsync } from '../lib/useAsync';
import { ForbiddenPage } from './ForbiddenPage';

const PAGE_LIMIT = 20;
const THREAD_LIMIT = 100;

const COMPOSE_FIELDS: FieldDef[] = [
  {
    name: 'subject',
    label: 'Subject',
    type: 'text',
    required: true,
    placeholder: 'e.g. Parent-teacher meeting',
  },
  {
    name: 'body',
    label: 'Message',
    type: 'textarea',
    required: true,
    placeholder: 'Write your message…',
  },
  {
    name: 'roles',
    label: 'Send to groups',
    type: 'multiselect',
    options: ROLE_RECIPIENT_OPTIONS.map((option) => ({ ...option })),
    help: 'Messages everyone holding the selected role in your school.',
  },
  {
    name: 'userIds',
    label: 'Specific people',
    type: 'multiselect',
    lookup: 'users',
    help: 'Include individual accounts in the conversation.',
  },
];

export function MessagesPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { version, messageVersion, status, refreshUnread } = useRealtime();
  const [page, setPage] = useState(1);
  const [composing, setComposing] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const selectedId = params.get('c');

  const conversations = useAsync(async () => {
    return api.list<ConversationSummary>('/conversations', { page, limit: PAGE_LIMIT });
  }, [page, version, messageVersion]);

  const thread = useAsync(async () => {
    if (!selectedId) return null;
    const [conversation, messages] = await Promise.all([
      api.get<ConversationSummary>(`/conversations/${selectedId}`),
      api.list<ConversationMessage>(`/conversations/${selectedId}/messages`, {
        page: 1,
        limit: THREAD_LIMIT,
      }),
    ]);
    return { conversation, messages: messages.items };
  }, [selectedId, version, messageVersion]);

  const setSelected = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('c', id);
    else next.delete('c');
    setParams(next, { replace: true });
  };

  const select = (id: string) => {
    setSelected(id);
    setReply('');
    setReplyError(null);
    void api
      .patch(`/conversations/${id}/read`)
      .then(() => {
        void refreshUnread();
        conversations.reload();
      })
      .catch(() => undefined);
  };

  const sendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId) return;
    const body = reply.trim();
    if (!body) {
      setReplyError('Message cannot be empty');
      return;
    }
    setSending(true);
    setReplyError(null);
    try {
      await api.post(`/conversations/${selectedId}/messages`, { body });
      setReply('');
      thread.reload();
      conversations.reload();
      void refreshUnread();
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const create = async (values: Record<string, unknown>) => {
    const created = await api.post<ConversationSummary>('/conversations', values);
    setComposing(false);
    conversations.reload();
    void refreshUnread();
    if (created?.id) setSelected(created.id);
  };

  const remove = async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await api.delete(`/conversations/${selectedId}`);
      setSelected(null);
      conversations.reload();
      void refreshUnread();
    } catch {
      // Leave the conversation open; the list refresh will reconcile state.
    }
  };

  if (!user) return null;
  if (conversations.forbidden) return <ForbiddenPage />;

  const canCompose = can(user.role, Permission.MESSAGE_MANAGE);
  const canDelete = can(user.role, Permission.MESSAGE_MANAGE);

  return (
    <div className="page">
      <PageHeader
        title="Messages"
        subtitle={
          conversations.data ? `${conversations.data.meta.total} conversation(s)` : 'Your inbox'
        }
        actions={
          <div className="toolbar toolbar--inline">
            <span className={`live live--${status}`} title="Realtime connection">
              {connectionLabel(status)}
            </span>
            {canCompose ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setComposing(true)}
              >
                New message
              </button>
            ) : null}
          </div>
        }
      />

      <div className="messages">
        <aside className="messages__list panel">
          {conversations.loading ? (
            <Spinner label="Loading conversations…" />
          ) : conversations.error ? (
            <ErrorState message={conversations.error} onRetry={conversations.reload} />
          ) : conversations.data ? (
            <>
              {conversations.data.items.length === 0 ? (
                <div className="state state--empty">No conversations yet.</div>
              ) : (
                <ul className="conversation-list">
                  {conversations.data.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`conversation${
                          item.id === selectedId ? ' conversation--active' : ''
                        }${item.unreadCount > 0 ? ' conversation--unread' : ''}`}
                        onClick={() => select(item.id)}
                      >
                        <span className="conversation__avatar" aria-hidden="true">
                          {conversationTitle(item).charAt(0).toUpperCase()}
                        </span>
                        <span className="conversation__main">
                          <span className="conversation__top">
                            <span className="conversation__subject">
                              {conversationTitle(item)}
                            </span>
                            <span className="conversation__time">
                              {formatDateTime(item.lastMessageAt)}
                            </span>
                          </span>
                          <span className="conversation__who">
                            {participantsSummary(item, user.id)}
                          </span>
                          <span className="conversation__preview">
                            {item.lastMessage ? truncate(item.lastMessage.body, 64) : 'No messages'}
                          </span>
                        </span>
                        {unreadBadge(item.unreadCount) ? (
                          <span className="conversation__badge">
                            {unreadBadge(item.unreadCount)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Pagination
                page={conversations.data.meta.page}
                totalPages={conversations.data.meta.totalPages}
                total={conversations.data.meta.total}
                onChange={setPage}
              />
            </>
          ) : null}
        </aside>

        <section className="messages__thread panel">
          {!selectedId ? (
            <div className="state state--empty">Select a conversation to read and reply.</div>
          ) : thread.loading ? (
            <Spinner label="Loading conversation…" />
          ) : thread.error ? (
            <ErrorState message={thread.error} onRetry={thread.reload} />
          ) : thread.data ? (
            <>
              <header className="thread__header">
                <div>
                  <h2 className="thread__subject">
                    {conversationTitle(thread.data.conversation)}
                  </h2>
                  <p className="thread__who">
                    {participantsSummary(thread.data.conversation, user.id)}
                  </p>
                </div>
                {canDelete ? (
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={remove}
                  >
                    Delete
                  </button>
                ) : null}
              </header>

              <ul className="thread">
                {thread.data.messages.length === 0 ? (
                  <li className="state state--empty">No messages yet.</li>
                ) : (
                  thread.data.messages.map((message) => {
                    const mine = isMine(message, user.id);
                    return (
                      <li
                        key={message.id}
                        className={`bubble${mine ? ' bubble--mine' : ''}`}
                      >
                        <div className="bubble__meta">
                          <span className="bubble__sender">
                            {mine ? 'You' : displayName(message.sender)}
                          </span>
                          <span className="bubble__time">{formatDateTime(message.createdAt)}</span>
                        </div>
                        <p className="bubble__body">{message.body}</p>
                      </li>
                    );
                  })
                )}
              </ul>

              <form className="reply" onSubmit={sendReply}>
                {replyError ? (
                  <div className="alert alert--error" role="alert">
                    {replyError}
                  </div>
                ) : null}
                <textarea
                  className="field__input"
                  rows={3}
                  placeholder="Write a reply…"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                />
                <div className="reply__actions">
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={sending || reply.trim() === ''}
                  >
                    {sending ? 'Sending…' : 'Send reply'}
                  </button>
                </div>
              </form>
            </>
          ) : null}
        </section>
      </div>

      {composing ? (
        <FormDialog
          title="New message"
          fields={COMPOSE_FIELDS}
          schema={createConversationSchema}
          initialValues={initialFromFields(COMPOSE_FIELDS)}
          submitLabel="Send"
          onClose={() => setComposing(false)}
          onSubmit={create}
        />
      ) : null}
    </div>
  );
}
