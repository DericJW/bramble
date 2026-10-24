import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type FirestoreError,
  type QuerySnapshot,
} from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { addMonths, monthFromKey, monthKey } from '../lib/dates';
import { getDb } from '../lib/firebase';
import { useTheme } from '../theme/theme';
import { useAuth } from './auth';
import { byOrder, sortEntries, worthOf } from './calc';
import { toAccount, toCategory, toEntry, toLiability, toProgram, toSettings, toSnapshot } from './convert';
import type { EffectState } from './effects';
import { takeSnapshot } from './repo';
import type { Account, Category, Entry, Liability, MilesEntry, Program, Settings, Snapshot } from './types';

export type DataValue = {
  uid: string | null;
  /** Everything has arrived at least once. */
  ready: boolean;
  /** Signed in but this farm has never been set up. */
  needsSetup: boolean;
  error: string | null;
  settings: Settings;
  accounts: Account[];
  programs: Program[];
  liabilities: Liability[];
  categories: Category[];
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
  uid: null,
  ready: false,
  needsSetup: false,
  error: null,
  settings: DEFAULT_SETTINGS,
  accounts: [],
  programs: [],
  liabilities: [],
  categories: [],
  monthEntries: [],
  milesEntries: [],
  snapshot: null,
  effectState: { accounts: [], liabilities: [], programs: [] },
};

const DataContext = createContext<DataValue>(EMPTY);

const STREAMS = ['settings', 'accounts', 'programs', 'liabilities', 'categories', 'miles', 'month', 'snapshot'] as const;
type Stream = (typeof STREAMS)[number];

export function explainFirestoreError(e: FirestoreError | Error): string {
  const code = 'code' in e ? String(e.code) : '';
  if (code === 'permission-denied') {
    return 'Firestore refused access (permission-denied). Publish the rules in firestore.rules to your Firebase project – see the README.';
  }
  if (code === 'failed-precondition') return 'Firestore is not ready yet. Create the Firestore database in the Firebase console.';
  if (code === 'unavailable') return 'Can’t reach Firestore right now. Changes will sync when you are back online.';
  return e.message || 'Something went wrong talking to Firestore.';
}

function entriesFrom(snap: QuerySnapshot): Entry[] {
  const out: Entry[] = [];
  snap.docs.forEach((d) => {
    const e = toEntry(d.id, d.data({ serverTimestamps: 'estimate' }));
    if (e) out.push(e);
  });
  return sortEntries(out);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { now } = useTheme();
  const mk = monthKey(now);

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsExists, setSettingsExists] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthEntries, setMonthEntries] = useState<Entry[]>([]);
  const [milesEntries, setMilesEntries] = useState<MilesEntry[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loaded, setLoaded] = useState<Partial<Record<Stream, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const snapshotTried = useRef<string>('');

  const mark = (s: Stream) => setLoaded((prev) => (prev[s] ? prev : { ...prev, [s]: true }));
  const fail = (e: FirestoreError) => setError(explainFirestoreError(e));

  // Settings and the lists of accounts, programs, liabilities and pouches.
  useEffect(() => {
    setLoaded({});
    setError(null);
    setSettingsExists(false);
    setSettings(DEFAULT_SETTINGS);
    setAccounts([]);
    setPrograms([]);
    setLiabilities([]);
    setCategories([]);
    setMilesEntries([]);
    if (!uid) return undefined;
    const db = getDb();
    const opts = { serverTimestamps: 'estimate' as const };
    const unsubs = [
      onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          setSettingsExists(snap.exists());
          setSettings(toSettings(snap.data(opts)));
          mark('settings');
        },
        fail,
      ),
      onSnapshot(
        collection(db, 'users', uid, 'accounts'),
        (snap) => {
          setAccounts(snap.docs.map((d) => toAccount(d.id, d.data(opts))).sort(byOrder));
          mark('accounts');
        },
        fail,
      ),
      onSnapshot(
        collection(db, 'users', uid, 'programs'),
        (snap) => {
          setPrograms(snap.docs.map((d) => toProgram(d.id, d.data(opts))).sort(byOrder));
          mark('programs');
        },
        fail,
      ),
      onSnapshot(
        collection(db, 'users', uid, 'liabilities'),
        (snap) => {
          setLiabilities(snap.docs.map((d) => toLiability(d.id, d.data(opts))).sort(byOrder));
          mark('liabilities');
        },
        fail,
      ),
      onSnapshot(
        collection(db, 'users', uid, 'categories'),
        (snap) => {
          setCategories(snap.docs.map((d) => toCategory(d.id, d.data(opts))).sort(byOrder));
          mark('categories');
        },
        fail,
      ),
      onSnapshot(
        query(collection(db, 'users', uid, 'entries'), where('type', '==', 'miles')),
        (snap) => {
          setMilesEntries(entriesFrom(snap).filter((e): e is MilesEntry => e.type === 'miles'));
          mark('miles');
        },
        fail,
      ),
    ];
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // This month's entries and this month's net worth snapshot.
  useEffect(() => {
    setMonthEntries([]);
    setSnapshot(null);
    setLoaded((prev) => ({ ...prev, month: false, snapshot: false }));
    if (!uid) return undefined;
    const db = getDb();
    const start = monthFromKey(mk);
    const end = addMonths(start, 1);
    const unsubs = [
      onSnapshot(
        query(collection(db, 'users', uid, 'entries'), where('date', '>=', start), where('date', '<', end)),
        (snap) => {
          setMonthEntries(entriesFrom(snap));
          mark('month');
        },
        fail,
      ),
      onSnapshot(
        doc(db, 'users', uid, 'snapshots', mk),
        (snap) => {
          setSnapshot(snap.exists() ? toSnapshot(snap.id, snap.data({ serverTimestamps: 'estimate' }) ?? {}) : null);
          mark('snapshot');
        },
        fail,
      ),
    ];
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, mk]);

  const ready = !!uid && STREAMS.every((s) => loaded[s]);

  // First visit in a new month: remember where net worth started.
  useEffect(() => {
    if (!uid || !ready || !settingsExists || snapshot || snapshotTried.current === `${uid}/${mk}`) return;
    snapshotTried.current = `${uid}/${mk}`;
    takeSnapshot(uid, mk, worthOf(accounts, liabilities)).catch(() => undefined);
  }, [uid, ready, settingsExists, snapshot, mk, accounts, liabilities]);

  const value = useMemo<DataValue>(
    () => ({
      uid,
      ready,
      needsSetup: ready && !settingsExists,
      error,
      settings,
      accounts,
      programs,
      liabilities,
      categories,
      monthEntries,
      milesEntries,
      snapshot,
      effectState: { accounts, liabilities, programs },
    }),
    [uid, ready, settingsExists, error, settings, accounts, programs, liabilities, categories, monthEntries, milesEntries, snapshot],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  return useContext(DataContext);
}
