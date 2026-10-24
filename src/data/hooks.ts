import { useCallback, useMemo } from 'react';

import { isSameMonth } from '../lib/dates';
import { currencyInfo, formatMoney, type CurrencyInfo, type MoneyFormat } from '../lib/money';
import { usePrefs } from '../theme/prefs';
import { useData } from './DataProvider';
import { refsOf } from './effects';
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

/** Entries for any month, newest first. */
export function useMonthEntries(month: Date): { entries: Entry[]; loading: boolean; error: string | null } {
  const { entries, monthEntries } = useData();
  const key = month.getFullYear() * 12 + month.getMonth();
  const list = useMemo(
    () => (isSameMonth(month, new Date()) ? monthEntries : entries.filter((e) => isSameMonth(e.date, month))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, monthEntries, key],
  );
  return { entries: list, loading: false, error: null };
}

/** Every entry that mentions an account, program, liability or pouch (newest first). */
export function useEntriesFor(refId: string | null): { entries: Entry[]; loading: boolean } {
  const { entries } = useData();
  const list = useMemo(() => (refId ? entries.filter((e) => refsOf(e).includes(refId)) : []), [entries, refId]);
  return { entries: list, loading: false };
}
