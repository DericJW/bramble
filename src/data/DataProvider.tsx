import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';

import { isSameMonth, monthKey } from '../lib/dates';
import { useTheme } from '../theme/theme';
import { worthOf } from './calc';
import type { EffectState } from './effects';
import { takeSnapshot } from './repo';
import { getStoreState, loadFarm, subscribeStore } from './store';
import type { Account, Category, Entry, Liability, MilesEntry, Program, Settings, Snapshot } from './types';

export type DataValue = {
  /** The farm has been read from this device. */
  ready: boolean;
  /** Nothing set up on this device yet. */
  needsSetup: boolean;
  error: string | null;
  settings: Settings;
  accounts: Account[];
  programs: Program[];
  liabilities: Liability[];
  categories: Category[];
  /** Every entry, newest first. */
  entries: Entry[];
  /** Entries dated in the current month. */
  monthEntries: Entry[];
  /** Every miles entry (for the flight log). */
  milesEntries: MilesEntry[];
  /** Net worth at the start of this month. */
  snapshot: Snapshot | null;
  /** What balance changes need to know about current state. */
  effectState: EffectState;
};

const DEFAULT_SETTINGS: Settings = { currency: 'SGD', countEveryDays: 14, goal: null };

const EMPTY: DataValue = {
  ready: false,
  needsSetup: false,
  error: null,
  settings: DEFAULT_SETTINGS,
  accounts: [],
  programs: [],
  liabilities: [],
  categories: [],
  entries: [],
  monthEntries: [],
  milesEntries: [],
  snapshot: null,
  effectState: { accounts: [], liabilities: [], programs: [] },
};

const DataContext = createContext<DataValue>(EMPTY);

export function DataProvider({ children }: { children: ReactNode }) {
  const store = useSyncExternalStore(subscribeStore, getStoreState, getStoreState);
  const { now } = useTheme();
  const mk = monthKey(now);
  const snapshotTried = useRef('');

  useEffect(() => {
    loadFarm().catch(() => undefined);
  }, []);

  const { farm, loaded, error } = store;
  const setUp = !!farm.settings;

  // First visit in a new month: remember where net worth started.
  const snapshot = farm.snapshots.find((s) => s.month === mk) ?? null;
  useEffect(() => {
    if (!loaded || !setUp || snapshot || snapshotTried.current === mk) return;
    snapshotTried.current = mk;
    takeSnapshot(mk, worthOf(farm.accounts, farm.liabilities)).catch(() => undefined);
  }, [loaded, setUp, snapshot, mk, farm.accounts, farm.liabilities]);

  const value = useMemo<DataValue>(() => {
    const monthEntries = farm.entries.filter((e) => isSameMonth(e.date, now));
    const milesEntries = farm.entries.filter((e): e is MilesEntry => e.type === 'miles');
    return {
      ready: loaded,
      needsSetup: loaded && !setUp,
      error,
      settings: farm.settings ?? DEFAULT_SETTINGS,
      accounts: farm.accounts,
      programs: farm.programs,
      liabilities: farm.liabilities,
      categories: farm.categories,
      entries: farm.entries,
      monthEntries,
      milesEntries,
      snapshot,
      effectState: { accounts: farm.accounts, liabilities: farm.liabilities, programs: farm.programs },
    };
    // `now` only matters when the month changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farm, loaded, setUp, error, snapshot, mk]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  return useContext(DataContext);
}
