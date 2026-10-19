import { MessagesPage } from '../MessagesPage';

/**
 * Teacher-scoped entry point for messages. Messaging is already scoped to the
 * signed-in user by the backend (`/messaging`), so this page reuses the shared
 * implementation rather than duplicating it.
 */
export function TeacherMessagesPage() {
  return <MessagesPage />;
}
