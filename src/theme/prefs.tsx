import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Preferences that belong to this phone rather than to your data: look and feel, the
 * privacy toggle, and what you picked last time in the entry form.
 */

export type ThemeMode = 'time' | 'day' | 'night' | 'system';
export type BodyFont = 'rounded' | 'pixel';

export type LastSource = { kind: 'account' | 'liability' | 'none'; id: string | null };

export type Prefs = {
  theme: ThemeMode;
  bodyFont: BodyFont;
  motion: boolean;
  hideAmounts: boolean;
  haptics: boolean;
  lastSource: LastSource | null;
  lastCategoryId: string | null;
  lastProgramId: string | null;
  lastPayFromId: string | null;
  /** When a backup was last exported from this phone (ms since 1970). */
  lastBackupAt: number | null;
};

export const DEFAULT_PREFS: Prefs = {
  theme: 'time',
  bodyFont: 'rounded',
  motion: true,
  hideAmounts: false,
  haptics: true,
  lastSource: null,
  lastCategoryId: null,
  lastProgramId: null,
  lastPayFromId: null,
  lastBackupAt: null,
};

const KEY = 'bramble:prefs:v1';

type PrefsContextValue = {
  prefs: Prefs;
  loaded: boolean;
  setPrefs: (patch: Partial<Prefs>) => void;
};

const PrefsContext = createContext<PrefsContextValue>({
  prefs: DEFAULT_PREFS,
  loaded: false,
  setPrefs: () => undefined,
});

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<Prefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        const parsed = JSON.parse(raw) as Partial<Prefs>;
        const merged = { ...DEFAULT_PREFS, ...parsed };
        latest.current = merged;
        setState(merged);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setState(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ prefs, loaded, setPrefs }), [prefs, loaded, setPrefs]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  return useContext(PrefsContext);
}
