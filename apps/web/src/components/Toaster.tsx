import { useNavigate } from 'react-router-dom';
import { humanize } from '../lib/format';
import { useRealtime } from './RealtimeProvider';

export function Toaster() {
  const { toasts, dismiss } = useRealtime();
  const navigate = useNavigate();

  if (toasts.length === 0) return null;

  const open = (id: string) => {
    dismiss(id);
    navigate('/notifications');
  };

  return (
    <div className="toaster" role="region" aria-label="Realtime notifications">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast" role="status">
          <button type="button" className="toast__main" onClick={() => open(toast.id)}>
            <span className="toast__type">{humanize(toast.type)}</span>
            <span className="toast__title">{toast.title}</span>
            {toast.body ? <span className="toast__text">{toast.body}</span> : null}
          </button>
          <button
            type="button"
            className="toast__close"
            aria-label="Dismiss notification"
            onClick={() => dismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
