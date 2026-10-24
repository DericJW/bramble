/**
 * Reading stored or imported records safely: every field gets a sensible default, so an old or
 * hand-edited document never crashes a screen.
 */
import { DEFAULT_CURRENCY } from '../lib/money';
import type {
  Account,
  AccountKind,
  Category,
  DueChange,
  Entry,
  EntryDraft,
  Liability,
  LiabilityKind,
  MilesGoal,
  Program,
  ProgramKind,
  Settings,
  Snapshot,
  SourceKind,
} from './types';

type Raw = Record<string, unknown>;

export function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: unknown }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function oneOf<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function toSettings(raw: Raw | undefined): Settings {
  const r = raw ?? {};
  const g = r.goal as Raw | null | undefined;
  let goal: MilesGoal | null = null;
  if (g && typeof g === 'object' && num(g.target) > 0) {
    goal = { label: str(g.label, 'Next trip'), programId: strOrNull(g.programId), target: num(g.target) };
  }
  return {
    currency: str(r.currency, DEFAULT_CURRENCY),
    countEveryDays: Math.max(1, num(r.countEveryDays, 14)),
    goal,
  };
}

export function toAccount(id: string, r: Raw): Account {
  return {
    id,
    name: str(r.name, 'Account'),
    kind: oneOf<AccountKind>(r.kind, ['bank', 'investment', 'cash'], 'bank'),
    icon: str(r.icon, 'bank'),
    balance: Math.round(num(r.balance)),
    lastCountedAt: toDate(r.lastCountedAt),
    order: num(r.order),
  };
}

export function toProgram(id: string, r: Raw): Program {
  return {
    id,
    name: str(r.name, 'Program'),
    kind: oneOf<ProgramKind>(r.kind, ['airline', 'hotel', 'points'], 'airline'),
    icon: str(r.icon, 'plane'),
    balance: Math.round(num(r.balance)),
    rate: numOrNull(r.rate),
    expiringAmount: numOrNull(r.expiringAmount),
    expiringOn: toDate(r.expiringOn),
    updatedAt: toDate(r.updatedAt),
    order: num(r.order),
  };
}

export function toLiability(id: string, r: Raw): Liability {
  return {
    id,
    name: str(r.name, 'Liability'),
    kind: oneOf<LiabilityKind>(r.kind, ['card', 'loan', 'personal'], 'card'),
    icon: str(r.icon, 'card'),
    balance: Math.round(num(r.balance)),
    dueDate: toDate(r.dueDate),
    repeatsMonthly: r.repeatsMonthly === true,
    dueAmount: numOrNull(r.dueAmount),
    termPayments: numOrNull(r.termPayments),
    paymentsMade: numOrNull(r.paymentsMade),
    payFromAccountId: strOrNull(r.payFromAccountId),
    note: str(r.note),
    order: num(r.order),
  };
}

export function toCategory(id: string, r: Raw): Category {
  return {
    id,
    name: str(r.name, 'Pouch'),
    icon: str(r.icon, 'sparkle'),
    budget: Math.max(0, Math.round(num(r.budget))),
    order: num(r.order),
  };
}

export function toSnapshot(id: string, r: Raw): Snapshot {
  return {
    month: id,
    assets: num(r.assets),
    liabilities: num(r.liabilities),
    net: num(r.net),
    takenAt: toDate(r.takenAt),
  };
}

function toDueChange(v: unknown): DueChange | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Raw;
  return { prev: toDate(r.prev), next: toDate(r.next) };
}

/** Returns null for documents that are not a recognisable entry. */
export function toEntry(id: string, r: Raw): Entry | null {
  const date = toDate(r.date);
  if (!date) return null;
  const base = { id, date, note: str(r.note), createdAt: toDate(r.createdAt) };
  switch (r.type) {
    case 'expense':
      return {
        ...base,
        type: 'expense',
        amount: Math.abs(Math.round(num(r.amount))),
        categoryId: str(r.categoryId),
        sourceKind: oneOf<SourceKind>(r.sourceKind, ['account', 'liability', 'none'], 'none'),
        sourceId: strOrNull(r.sourceId),
      };
    case 'balance':
      return {
        ...base,
        type: 'balance',
        accountId: str(r.accountId),
        amount: Math.round(num(r.amount)),
        prevBalance: Math.round(num(r.prevBalance)),
        prevCountedAt: toDate(r.prevCountedAt),
      };
    case 'miles': {
      const mode = oneOf(r.mode, ['earn', 'use', 'transfer'] as const, 'earn');
      return {
        ...base,
        type: 'miles',
        mode,
        programId: str(r.programId),
        amount: Math.abs(Math.round(num(r.amount))),
        delta: Math.round(num(r.delta)),
        fromProgramId: strOrNull(r.fromProgramId),
        fromAmount: Math.abs(Math.round(num(r.fromAmount))),
      };
    }
    case 'liability':
      return {
        ...base,
        type: 'liability',
        mode: oneOf(r.mode, ['payment', 'charge'] as const, 'payment'),
        liabilityId: str(r.liabilityId),
        amount: Math.abs(Math.round(num(r.amount))),
        fromAccountId: strOrNull(r.fromAccountId),
        dueChange: toDueChange(r.dueChange),
        countsAsInstalment: r.countsAsInstalment === true,
      };
    default:
      return null;
  }
}

/** The fields saved for an entry (ids and timestamps are added by the caller). */
export function entryFields(d: EntryDraft): Raw {
  const base: Raw = { type: d.type, date: d.date, note: d.note.trim() };
  switch (d.type) {
    case 'expense':
      return { ...base, amount: d.amount, categoryId: d.categoryId, sourceKind: d.sourceKind, sourceId: d.sourceId };
    case 'balance':
      return { ...base, accountId: d.accountId, amount: d.amount, prevBalance: d.prevBalance, prevCountedAt: d.prevCountedAt };
    case 'miles':
      return {
        ...base,
        mode: d.mode,
        programId: d.programId,
        amount: d.amount,
        delta: d.delta,
        fromProgramId: d.fromProgramId,
        fromAmount: d.fromAmount,
      };
    case 'liability':
      return {
        ...base,
        mode: d.mode,
        liabilityId: d.liabilityId,
        amount: d.amount,
        fromAccountId: d.fromAccountId,
        dueChange: d.dueChange ? { prev: d.dueChange.prev, next: d.dueChange.next } : null,
        countsAsInstalment: d.countsAsInstalment,
      };
  }
}
