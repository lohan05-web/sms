import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, api } from './api';
import { useAuth } from './auth';
import { getActiveCurrency, setActiveCurrency } from './format';

export interface SchoolSettings {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  timezone: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SettingsContextValue {
  settings: SchoolSettings | null;
  currency: string;
  timezone: string;
  loading: boolean;
  error: string | null;
  reload: () => void;
  applySettings: (settings: SchoolSettings) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const FALLBACK_TIMEZONE = 'UTC';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const hasSchool = Boolean(user?.schoolId);

  useEffect(() => {
    if (!user || !hasSchool) {
      setSettings(null);
      setActiveCurrency(null);
      setError(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get<SchoolSettings>('/schools/me')
      .then((data) => {
        if (!active) return;
        setSettings(data);
        setActiveCurrency(data.currency);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setSettings(null);
        setActiveCurrency(null);
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load school settings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, hasSchool, nonce]);

  const applySettings = useCallback((next: SchoolSettings) => {
    setSettings(next);
    setActiveCurrency(next.currency);
  }, []);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      currency: settings?.currency ?? getActiveCurrency(),
      timezone: settings?.timezone ?? FALLBACK_TIMEZONE,
      loading,
      error,
      reload,
      applySettings,
    }),
    [settings, loading, error, reload, applySettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
