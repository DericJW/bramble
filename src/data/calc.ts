/**
 * Totals and summaries shown around the app. Pure functions over the data, no React here.
 */
import {
  addMonths,
  daysBetween,
  daysInMonth,
  dayKey,
  formatShortDate,
  isNightTime,
  isSameDay,
  isSameMonth,
  MONTHS,
  ordinal,
  relativeDay,
} from '../lib/dates';
import { formatMoney, percent } from '../lib/money';
import type {
  Account,
  AccountKind,
  Category,
  Entry,
  ExpenseEntry,
  Liability,
  LiabilityKind,
  MilesGoal,
  Program,
  Snapshot,
} from './types';

export function sumBalances(list: { balance: number }[]): number {
  return list.reduce((t, x) => t + (Number.isFinite(x.balance) ? x.balance : 0), 0);
}

export type Worth = { assets: number; owed: number; net: number };

export function worthOf(accounts: Account[], liabilities: Liability[]): Worth {
  const assets = sumBalances(accounts);
  const owed = sumBalances(liabilities);
  return { assets, owed, net: assets - owed };
}

/** Change in net worth since this month's snapshot, or null when there is no snapshot yet. */
export function changeSince(worth: Worth, snapshot: Snapshot | null): number | null {
  return snapshot ? worth.net - snapshot.net : null;
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export const ACCOUNT_KINDS: { kind: AccountKind; title: string; jar: string }[] = [
  { kind: 'bank', title: 'Bank accounts', jar: 'Bank' },
  { kind: 'investment', title: 'Investments', jar: 'Investments' },
  { kind: 'cash', title: 'Cash', jar: 'Cash' },
];

export type AccountGroup = {
  kind: AccountKind;
  title: string;
  jar: string;
  total: number;
  /** Share of all money, 0..1 (negative balances count as 0). */
  share: number;
  accounts: Account[];
};

export function groupAccounts(accounts: Account[]): AccountGroup[] {
  const positiveTotal = accounts.reduce((t, a) => t + Math.max(0, a.balance), 0);
  return ACCOUNT_KINDS.map(({ kind, title, jar }) => {
    const list = accounts.filter((a) => a.kind === kind).sort(byOrder);
    const total = sumBalances(list);
    const positive = list.reduce((t, a) => t + Math.max(0, a.balance), 0);
    return { kind, title, jar, total, share: positiveTotal > 0 ? positive / positiveTotal : 0, accounts: list };
  });
}

/** "68%", "under 1%", "0%" */
export function shareLabel(share: number): string {
  if (share <= 0) return '0%';
  if (share < 0.005) return 'under 1%';
  return `${Math.round(share * 100)}%`;
}

export function byOrder<T extends { order: number; name?: string }>(a: T, b: T): number {
  if (a.order !== b.order) return a.order - b.order;
  return (a.name ?? '').localeCompare(b.name ?? '');
}

export function isCountDue(account: Account, now: Date, everyDays: number): boolean {
  if (!account.lastCountedAt) return true;
  return daysBetween(account.lastCountedAt, now) > everyDays;
}

export function staleAccounts(accounts: Account[], now: Date, everyDays: number): Account[] {
  return accounts.filter((a) => isCountDue(a, now, everyDays)).sort(byOrder);
}

/** "Counted today", "Counted 14 Oct", "Never counted" */
export function countedLabel(account: Account, now: Date): string {
  if (!account.lastCountedAt) return 'Not counted yet';
  const days = daysBetween(account.lastCountedAt, now);
  if (days === 0) return 'Counted today';
  if (days === 1) return 'Counted yesterday';
  return `Counted ${formatShortDate(account.lastCountedAt)}`;
}

/* ------------------------------------------------------------------ */
/* Miles                                                               */
/* ------------------------------------------------------------------ */

/** Miles a program is worth: airline miles count as they are, points convert at their rate. */
export function milesValue(p: Program): number {
  if (p.kind === 'airline') return p.balance;
  if (p.rate && p.rate > 0) return Math.floor(Math.max(0, p.balance) / p.rate);
  return 0;
}

export type MilesSummary = { total: number; fromPoints: number; programs: number };

export function milesSummary(programs: Program[]): MilesSummary {
  let total = 0;
  let fromPoints = 0;
  for (const p of programs) {
    const v = milesValue(p);
    total += v;
    if (p.kind !== 'airline') fromPoints += v;
  }
  return { total, fromPoints, programs: programs.length };
}

export function unitOf(p: Pick<Program, 'kind'>): 'mi' | 'pts' {
  return p.kind === 'airline' ? 'mi' : 'pts';
}

export type GoalProgress = { label: string; current: number; target: number; pct: number; toGo: number; programName: string };

export function goalProgress(goal: MilesGoal | null, programs: Program[]): GoalProgress | null {
  if (!goal || goal.target <= 0) return null;
  const program = goal.programId ? programs.find((p) => p.id === goal.programId) : undefined;
  if (goal.programId && !program) return null;
  const current = program ? program.balance : milesSummary(programs).total;
  return {
    label: goal.label,
    current,
    target: goal.target,
    pct: Math.min(100, percent(current, goal.target)),
    toGo: Math.max(0, goal.target - current),
    programName: program ? program.name : 'all programs',
  };
}

/* ------------------------------------------------------------------ */
/* Spending                                                            */
/* ------------------------------------------------------------------ */

export function isExpense(e: Entry): e is ExpenseEntry {
  return e.type === 'expense';
}

export type MonthStats = {
  spent: number;
  budget: number;
  left: number;
  /** Percent of budget used (0 when there is no budget). */
  pct: number;
  daysInMonth: number;
  /** Days left including today for the current month, all days for a future month, 0 for a past one. */
  daysLeft: number;
  /** What you can spend per day from now and stay on budget. */
  perDay: number;
  /** Today's allowance: what was left at the start of today divided by the days left. */
  allowanceToday: number;
  spentToday: number;
  isCurrent: boolean;
  byCategory: Record<string, number>;
  count: number;
};

export function monthStats(entries: Entry[], categories: Category[], month: Date, now: Date): MonthStats {
  const expenses = entries.filter(isExpense).filter((e) => isSameMonth(e.date, month));
  const byCategory: Record<string, number> = {};
  let spent = 0;
  let spentToday = 0;
  for (const e of expenses) {
    spent += e.amount;
    byCategory[e.categoryId] = (byCategory[e.categoryId] ?? 0) + e.amount;
    if (isSameDay(e.date, now)) spentToday += e.amount;
  }
  const budget = categories.reduce((t, c) => t + Math.max(0, c.budget), 0);
  const dim = daysInMonth(month.getFullYear(), month.getMonth());
  const isCurrent = isSameMonth(month, now);
  const isFuture = !isCurrent && month.getTime() > now.getTime();
  const daysLeft = isCurrent ? dim - now.getDate() + 1 : isFuture ? dim : 0;
  const left = budget - spent;
  const perDay = daysLeft > 0 ? Math.max(0, Math.round(left / daysLeft)) : 0;
  const allowanceToday = daysLeft > 0 ? Math.max(0, Math.round((left + spentToday) / daysLeft)) : 0;
  return {
    spent,
    budget,
    left,
    pct: budget > 0 ? percent(spent, budget) : 0,
    daysInMonth: dim,
    daysLeft,
    perDay,
    allowanceToday,
    spentToday,
    isCurrent,
    byCategory,
    count: expenses.length,
  };
}

export type PouchStatus = 'ok' | 'near' | 'over' | 'none';

export type PouchStat = {
  id: string;
  name: string;
  icon: string;
  budget: number;
  spent: number;
  left: number;
  pct: number;
  status: PouchStatus;
  /** Expenses whose category was deleted are gathered in a pouch with this flag. */
  orphan?: boolean;
};

export function pouchStats(categories: Category[], byCategory: Record<string, number>): PouchStat[] {
  const out: PouchStat[] = [...categories].sort(byOrder).map((c) => {
    const spent = byCategory[c.id] ?? 0;
    const budget = Math.max(0, c.budget);
    const pct = budget > 0 ? percent(spent, budget) : 0;
    const status: PouchStatus = budget <= 0 ? 'none' : spent > budget ? 'over' : pct >= 80 ? 'near' : 'ok';
    return { id: c.id, name: c.name, icon: c.icon, budget, spent, left: budget - spent, pct, status };
  });
  const known = new Set(categories.map((c) => c.id));
  const orphanSpent = Object.entries(byCategory)
    .filter(([id]) => !known.has(id))
    .reduce((t, [, v]) => t + v, 0);
  if (orphanSpent > 0) {
    out.push({ id: '__other', name: 'Other', icon: 'sparkle', budget: 0, spent: orphanSpent, left: 0, pct: 0, status: 'none', orphan: true });
  }
  return out;
}

export function sortEntries<T extends Entry>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const d = b.date.getTime() - a.date.getTime();
    if (d !== 0) return d;
    return (b.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (a.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER);
  });
}

export type DayGroup<T> = { key: string; label: string; items: T[] };

export function groupByDay<T extends Entry>(entries: T[], now: Date): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const e of sortEntries(entries)) {
    const key = dayKey(e.date);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: relativeDay(e.date, now), items: [] };
      groups.push(g);
    }
    g.items.push(e);
  }
  return groups;
}

/* ------------------------------------------------------------------ */
/* Liabilities                                                         */
/* ------------------------------------------------------------------ */

export const LIABILITY_KINDS: { kind: LiabilityKind; title: string; legend: string; color: string; hi: string }[] = [
  { kind: 'loan', title: 'Loans', legend: 'Loans', color: '#8A3418', hi: '#B0482A' },
  { kind: 'card', title: 'Credit cards', legend: 'Credit cards', color: '#D9622B', hi: '#EE8A55' },
  { kind: 'personal', title: 'Personal', legend: 'Personal', color: '#F0C9B6', hi: '#F0C9B6' },
];

/** What is due on the next due date: the statement / instalment amount, never more than the balance. */
export function dueAmountOf(l: Liability): number {
  const want = l.dueAmount ?? l.balance;
  return Math.max(0, Math.min(want, l.balance));
}

export type KindShare = { kind: LiabilityKind; title: string; legend: string; color: string; hi: string; total: number; share: number };

export type LiabilitySummary = {
  total: number;
  byKind: KindShare[];
  /** Liabilities with a due date in the next `days` days (or overdue), soonest first. */
  dueSoon: Liability[];
  dueSoonTotal: number;
};

export function liabilitySummary(liabilities: Liability[], now: Date, days = 30): LiabilitySummary {
  const total = sumBalances(liabilities);
  const positive = liabilities.reduce((t, l) => t + Math.max(0, l.balance), 0);
  const byKind = LIABILITY_KINDS.map((k) => {
    const kTotal = liabilities.filter((l) => l.kind === k.kind).reduce((t, l) => t + Math.max(0, l.balance), 0);
    return { ...k, total: kTotal, share: positive > 0 ? kTotal / positive : 0 };
  });
  const dueSoon = liabilities
    .filter((l) => l.dueDate && l.balance > 0 && daysBetween(now, l.dueDate) <= days)
    .sort((a, b) => (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime());
  return { total, byKind, dueSoon, dueSoonTotal: dueSoon.reduce((t, l) => t + dueAmountOf(l), 0) };
}

export type LoanProgress = { made: number; total: number; pct: number; endDate: Date | null };

export function loanProgress(l: Liability): LoanProgress | null {
  if (l.kind !== 'loan' || !l.termPayments || l.termPayments <= 0) return null;
  const made = Math.max(0, Math.min(l.paymentsMade ?? 0, l.termPayments));
  const remaining = l.termPayments - made;
  return {
    made,
    total: l.termPayments,
    pct: Math.round((made / l.termPayments) * 100),
    endDate: l.dueDate && remaining > 0 ? addMonths(l.dueDate, remaining - 1) : null,
  };
}

export function nextDue(liabilities: Liability[], now: Date): Liability | null {
  const list = liabilities
    .filter((l) => l.dueDate && l.balance > 0)
    .sort((a, b) => (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime());
  return list.find((l) => daysBetween(now, l.dueDate as Date) >= 0) ?? list[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* Coming up                                                           */
/* ------------------------------------------------------------------ */

export type UpcomingItem =
  | { key: string; kind: 'due'; liability: Liability; date: Date; days: number; amount: number }
  | { key: string; kind: 'expiry'; program: Program; date: Date; days: number; count: number };

export function upcoming(liabilities: Liability[], programs: Program[], now: Date, dueWithin = 31, expiryWithin = 183): UpcomingItem[] {
  const items: UpcomingItem[] = [];
  for (const l of liabilities) {
    if (!l.dueDate || l.balance <= 0) continue;
    const days = daysBetween(now, l.dueDate);
    if (days <= dueWithin) items.push({ key: `due-${l.id}`, kind: 'due', liability: l, date: l.dueDate, days, amount: dueAmountOf(l) });
  }
  for (const p of programs) {
    if (!p.expiringOn || !p.expiringAmount || p.expiringAmount <= 0) continue;
    const days = daysBetween(now, p.expiringOn);
    if (days >= 0 && days <= expiryWithin) {
      items.push({ key: `exp-${p.id}`, kind: 'expiry', program: p, date: p.expiringOn, days, count: p.expiringAmount });
    }
  }
  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/* ------------------------------------------------------------------ */
/* Bramble's notes                                                     */
/* ------------------------------------------------------------------ */

export type TipPart = { text: string; tone?: 'good' | 'warn' };

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

function countWord(n: number): string {
  return n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function periodText(days: number): string {
  if (days === 7) return 'a week';
  if (days === 14) return 'two weeks';
  if (days === 30 || days === 31) return 'a month';
  return `${days} days`;
}

function dueWhen(l: Liability, now: Date): string {
  const days = daysBetween(now, l.dueDate as Date);
  if (days < 0) return 'is overdue';
  if (days === 0) return 'is due today';
  if (days === 1) return 'is due tomorrow';
  return `is due on the ${ordinal((l.dueDate as Date).getDate())}`;
}

export type HomeTipInput = {
  now: Date;
  currency: string;
  hidden: boolean;
  stats: MonthStats;
  liabilities: Liability[];
  hasAnything: boolean;
};

export function homeTip(input: HomeTipInput): TipPart[] {
  const { now, currency, hidden, stats, liabilities } = input;
  const money = (c: number) => formatMoney(c, currency, { hidden, dots: 2 });
  if (!input.hasAnything) {
    return [
      { text: "Hi, I'm Bramble! Add a jar of money on the " },
      { text: 'Money', tone: 'good' },
      { text: " tab and key in what you spend. I'll keep count with you." },
    ];
  }

  const due = nextDue(liabilities, now);
  const dueSoon = due && due.dueDate && daysBetween(now, due.dueDate) <= 14 ? due : null;
  const duePart: TipPart[] = dueSoon ? [{ text: ` Your ${dueSoon.name} ${dueWhen(dueSoon, now)}.` }] : [];
  const month = MONTHS[now.getMonth()];

  if (isNightTime(now) && stats.budget > 0) {
    if (stats.spentToday === 0) {
      return [{ text: 'Evening! ' }, { text: 'No spending today', tone: 'good' }, { text: ". That's a tidy harvest. Sleep tight!" }];
    }
    if (stats.spentToday <= stats.allowanceToday) {
      return [
        { text: 'Evening! You spent ' },
        { text: money(stats.spentToday), tone: 'good' },
        { text: ` today, well under your ${money(stats.allowanceToday)} daily allowance. Sleep tight!` },
      ];
    }
    return [
      { text: 'Evening! You spent ' },
      { text: money(stats.spentToday), tone: 'warn' },
      { text: ` today, a little over your ${money(stats.allowanceToday)} a day. Tomorrow is a fresh field!` },
    ];
  }

  const hello = now.getHours() < 12 && now.getHours() >= 5 ? 'Morning!' : now.getHours() < 17 && now.getHours() >= 12 ? 'Afternoon!' : 'Evening!';
  if (stats.budget <= 0) {
    return [{ text: `${hello} Set a budget for your spending pouches and I'll work out a daily allowance.` }, ...duePart];
  }
  if (stats.left < 0) {
    return [
      { text: `${hello} ${month} is ` },
      { text: `${money(-stats.left)} over budget`, tone: 'warn' },
      { text: '. Maybe a cosy night in?' },
      ...duePart,
    ];
  }
  const daysText = stats.daysLeft === 1 ? 'today' : `for ${stats.daysLeft} more days`;
  return [
    { text: `${hello} You can spend ` },
    { text: `${money(stats.perDay)} a day`, tone: 'good' },
    { text: ` ${daysText} and stay on budget.` },
    ...duePart,
  ];
}

export function moneyTip(accounts: Account[], now: Date, everyDays: number): TipPart[] {
  if (accounts.length === 0) {
    return [{ text: 'No jars yet! Tap ' }, { text: '+', tone: 'good' }, { text: ' to add your bank accounts, investments and cash.' }];
  }
  const stale = staleAccounts(accounts, now, everyDays);
  if (stale.length === 0) {
    return [{ text: 'Every jar has been counted lately. ' }, { text: 'Lovely tidy shelves!', tone: 'good' }];
  }
  const names = stale.slice(0, 3).map((a) => a.name);
  const more = stale.length > 3 ? ` and ${stale.length - 3} more` : '';
  const parts: TipPart[] = [];
  if (stale.length === 1) {
    parts.push({ text: 'Your ' }, { text: names[0], tone: 'warn' }, { text: ` hasn't been counted in over ${periodText(everyDays)}. Give it a fresh count!` });
    return parts;
  }
  parts.push({ text: `${countWord(stale.length)} jars haven't been counted in over ${periodText(everyDays)}. Your ` });
  names.forEach((n, i) => {
    if (i > 0) parts.push({ text: i === names.length - 1 && !more ? ' and ' : ', ' });
    parts.push({ text: n, tone: 'warn' });
  });
  parts.push({ text: `${more} could use a fresh count!` });
  return parts;
}

export { joinNames };
