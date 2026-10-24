import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { addMonths, isSameMonth, startOfMonth } from '../lib/dates';
import { getDb } from '../lib/firebase';
import { currencyInfo, formatMoney, type CurrencyInfo, type MoneyFormat } from '../lib/money';
import { usePrefs } from '../theme/prefs';
import { sortEntries } from './calc';
import { toEntry } from './convert';
import { explainFirestoreError, useData } from './DataProvider';
import type { Entry } from './types';

export type MoneyFormatter = {
  /** Format cents in the farm's currency, hiding the digits in privacy mode. */
  fmt: (cents: number, opts?: MoneyFormat) => string;
  hidden: boolean;
  currency: CurrencyInfo;
};

export function useMoney(): MoneyFormatter {
  const { settings } = useData();
  const { prefs } = usePrefs();
  const hidden = prefs.hideAmounts;
  const code = settings.currency;
  const fmt = useCallback((cents: number, opts?: MoneyFormat) => formatMoney(cents, code, { hidden, ...opts }), [code, hidden]);
  return useMemo(() => ({ fmt, hidden, currency: currencyInfo(code) }), [fmt, hidden, code]);
}

/** Entries for any month: the current month comes from the shared data, others are fetched live. */
export function useMonthEntries(month: Date): { entries: Entry[]; loading: boolean; error: string | null } {
  const { uid, monthEntries } = useData();
  const current = isSameMonth(month, new Date());
  const key = startOfMonth(month).getTime();
  const [state, setState] = useState<{ key: number; entries: Entry[]; loading: boolean; error: string | null }>({
    key: 0,
    entries: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (current || !uid) return undefined;
    setState({ key, entries: [], loading: true, error: null });
    const start = new Date(key);
    const end = addMonths(start, 1);
    return onSnapshot(
      query(collection(getDb(), 'users', uid, 'entries'), where('date', '>=', start), where('date', '<', end)),
      (snap) => {
        const list: Entry[] = [];
        snap.docs.forEach((d) => {
          const e = toEntry(d.id, d.data({ serverTimestamps: 'estimate' }));
          if (e) list.push(e);
        });
        setState({ key, entries: sortEntries(list), loading: false, error: null });
      },
      (e) => setState({ key, entries: [], loading: false, error: explainFirestoreError(e) }),
    );
  }, [current, uid, key]);

  if (current) return { entries: monthEntries, loading: false, error: null };
  if (state.key !== key) return { entries: [], loading: true, error: null };
  return { entries: state.entries, loading: state.loading, error: state.error };
}

/** Every entry that mentions an account, program, liability or pouch (newest first). */
export function useEntriesFor(refId: string | null): { entries: Entry[]; loading: boolean } {
  const { uid } = useData();
  const [state, setState] = useState<{ id: string | null; entries: Entry[]; loading: boolean }>({ id: null, entries: [], loading: true });

  useEffect(() => {
    if (!uid || !refId) return undefined;
    return onSnapshot(
      query(collection(getDb(), 'users', uid, 'entries'), where('refs', 'array-contains', refId)),
      (snap) => {
        const list: Entry[] = [];
        snap.docs.forEach((d) => {
          const e = toEntry(d.id, d.data({ serverTimestamps: 'estimate' }));
          if (e) list.push(e);
        });
        setState({ id: refId, entries: sortEntries(list), loading: false });
      },
      () => setState({ id: refId, entries: [], loading: false }),
    );
  }, [uid, refId]);

  if (!refId) return { entries: [], loading: false };
  if (state.id !== refId) return { entries: [], loading: true };
  return { entries: state.entries, loading: state.loading };
}
