/**
 * How an entry reads in a list: which sprite, a title, a subtitle and the amount.
 */
import { unitOf } from '../data/calc';
import type { Account, Category, Entry, Liability, Program } from '../data/types';
import { formatCount, type MoneyFormat } from '../lib/money';

export type Lookups = {
  accounts: Account[];
  programs: Program[];
  liabilities: Liability[];
  categories: Category[];
};

export type EntryLine = {
  icon: string;
  title: string;
  sub: string;
  amount: string;
  tone: 'good' | 'warn' | 'plain';
};

type Fmt = (cents: number, opts?: MoneyFormat) => string;

export function sourceName(kind: 'account' | 'liability' | 'none', id: string | null, l: Lookups): string {
  if (kind === 'account') return l.accounts.find((a) => a.id === id)?.name ?? 'Removed account';
  if (kind === 'liability') return l.liabilities.find((x) => x.id === id)?.name ?? 'Removed card';
  return 'Not tracked';
}

export function describeEntry(e: Entry, l: Lookups, fmt: Fmt, hidden: boolean): EntryLine {
  switch (e.type) {
    case 'expense': {
      const cat = l.categories.find((c) => c.id === e.categoryId);
      const catName = cat?.name ?? 'Other';
      return {
        icon: cat?.icon ?? 'sparkle',
        title: e.note || catName,
        sub: `${catName} · ${sourceName(e.sourceKind, e.sourceId, l)}`,
        amount: fmt(-e.amount),
        tone: 'plain',
      };
    }
    case 'balance': {
      const acc = l.accounts.find((a) => a.id === e.accountId);
      const name = acc?.name ?? 'Removed account';
      const delta = e.amount - e.prevBalance;
      return {
        icon: acc?.icon ?? 'bank',
        title: e.note || `Counted ${name}`,
        sub: `${name} · now ${fmt(e.amount)}`,
        amount: delta === 0 ? 'No change' : fmt(delta, { sign: 'always' }),
        tone: delta > 0 ? 'good' : delta < 0 ? 'warn' : 'plain',
      };
    }
    case 'miles': {
      const prog = l.programs.find((p) => p.id === e.programId);
      const name = prog?.name ?? 'Removed program';
      const unit = prog ? unitOf(prog) : 'mi';
      const fallback = e.mode === 'earn' ? 'Miles earned' : e.mode === 'use' ? 'Miles redeemed' : 'Points transfer';
      let sub = name;
      if (e.mode === 'transfer') {
        const from = l.programs.find((p) => p.id === e.fromProgramId);
        sub = `${from?.name ?? 'Points'} → ${name}`;
      }
      return {
        icon: prog?.icon ?? 'plane',
        title: e.note || fallback,
        sub,
        amount: `${formatCount(e.delta, { sign: 'always', hidden })}${unit === 'pts' ? ' pts' : ''}`,
        tone: e.delta > 0 ? 'good' : 'plain',
      };
    }
    case 'liability': {
      const liab = l.liabilities.find((x) => x.id === e.liabilityId);
      const name = liab?.name ?? 'Removed liability';
      if (e.mode === 'payment') {
        const from = e.fromAccountId ? l.accounts.find((a) => a.id === e.fromAccountId)?.name : null;
        return {
          icon: liab?.icon ?? 'scroll',
          title: e.note || `Paid ${name}`,
          sub: from ? `Payment · from ${from}` : 'Payment',
          amount: fmt(-e.amount),
          tone: 'good',
        };
      }
      return {
        icon: liab?.icon ?? 'scroll',
        title: e.note || `Charged to ${name}`,
        sub: 'New charge',
        amount: fmt(e.amount, { sign: 'always' }),
        tone: 'warn',
      };
    }
  }
}
