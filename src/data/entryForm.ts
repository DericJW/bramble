/**
 * The logic behind the entry screen, kept free of React so it can be unit tested:
 * where the form starts, what it adds up to, what is missing, and the entry it saves.
 */
import { atNoon } from '../lib/dates';
import { centsToDigits, digitsToCents, digitsToCount } from '../lib/money';
import { paymentDraft, shouldRoll } from './actions';
import type {
  Account,
  Category,
  Entry,
  EntryDraft,
  EntryType,
  Liability,
  LiabilityMode,
  MilesMode,
  Program,
  SourceKind,
} from './types';

export type EntryParams = {
  id?: string;
  type?: string;
  account?: string;
  program?: string;
  liability?: string;
  category?: string;
  mode?: string;
};

export type EntryFormState = {
  type: EntryType;
  /** The keys pressed on the number pad. */
  digits: string;
  date: Date;
  note: string;
  categoryId: string | null;
  sourceKind: SourceKind;
  sourceId: string | null;
  accountId: string | null;
  milesMode: MilesMode;
  programId: string | null;
  fromProgramId: string | null;
  liabMode: LiabilityMode;
  liabilityId: string | null;
  payFromId: string | null;
  /** Move the due date on with this payment; null means "decide from the amount". */
  roll: boolean | null;
};

export type FormContext = {
  accounts: Account[];
  programs: Program[];
  liabilities: Liability[];
  categories: Category[];
};

export type FormPrefs = {
  lastSource: { kind: SourceKind; id: string | null } | null;
  lastCategoryId: string | null;
  lastProgramId: string | null;
  lastPayFromId: string | null;
};

function has<T extends { id: string }>(list: T[], id: string | null | undefined): id is string {
  return !!id && list.some((x) => x.id === id);
}

export function initialForm(params: EntryParams, existing: Entry | null, ctx: FormContext, prefs: FormPrefs, decimals: 0 | 2, now: Date = new Date()): EntryFormState {
  const firstAccount = ctx.accounts[0]?.id ?? null;
  const firstProgram = ctx.programs[0]?.id ?? null;

  const last = prefs.lastSource;
  const lastOk =
    !!last &&
    (last.kind === 'none' || (last.kind === 'account' && has(ctx.accounts, last.id)) || (last.kind === 'liability' && has(ctx.liabilities, last.id)));

  const programId = has(ctx.programs, params.program) ? params.program : has(ctx.programs, prefs.lastProgramId) ? prefs.lastProgramId : firstProgram;
  const pointsSource = ctx.programs.find((p) => p.id !== programId && p.kind !== 'airline') ?? ctx.programs.find((p) => p.id !== programId);
  const soonest = [...ctx.liabilities]
    .filter((l) => l.dueDate && l.balance > 0)
    .sort((a, b) => (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime())[0];
  const liabilityId = has(ctx.liabilities, params.liability) ? params.liability : (soonest?.id ?? ctx.liabilities[0]?.id ?? null);
  const liab = ctx.liabilities.find((l) => l.id === liabilityId);

  const base: EntryFormState = {
    type: (['expense', 'balance', 'miles', 'liability'] as const).find((t) => t === params.type) ?? 'expense',
    digits: '',
    date: atNoon(now),
    note: '',
    categoryId: has(ctx.categories, params.category)
      ? params.category
      : has(ctx.categories, prefs.lastCategoryId)
        ? prefs.lastCategoryId
        : (ctx.categories[0]?.id ?? null),
    sourceKind: lastOk && last ? last.kind : firstAccount ? 'account' : 'none',
    sourceId: lastOk && last ? last.id : firstAccount,
    accountId: has(ctx.accounts, params.account) ? params.account : firstAccount,
    milesMode: params.mode === 'use' ? 'use' : params.mode === 'transfer' ? 'transfer' : 'earn',
    programId,
    fromProgramId: pointsSource?.id ?? null,
    liabMode: params.mode === 'charge' ? 'charge' : 'payment',
    liabilityId,
    payFromId: liab?.payFromAccountId ?? (has(ctx.accounts, prefs.lastPayFromId) ? prefs.lastPayFromId : null),
    roll: null,
  };

  if (!existing) return base;
  const common: EntryFormState = { ...base, type: existing.type, date: existing.date, note: existing.note };
  switch (existing.type) {
    case 'expense':
      return {
        ...common,
        digits: centsToDigits(existing.amount, decimals),
        categoryId: existing.categoryId,
        sourceKind: existing.sourceKind,
        sourceId: existing.sourceId,
      };
    case 'balance':
      return { ...common, digits: existing.amount === 0 ? '0' : centsToDigits(existing.amount, decimals), accountId: existing.accountId };
    case 'miles':
      return {
        ...common,
        digits: String(existing.amount),
        milesMode: existing.mode,
        programId: existing.programId,
        fromProgramId: existing.fromProgramId ?? base.fromProgramId,
      };
    case 'liability':
      return {
        ...common,
        digits: centsToDigits(existing.amount, decimals),
        liabMode: existing.mode,
        liabilityId: existing.liabilityId,
        payFromId: existing.fromAccountId,
        roll: existing.dueChange ? true : existing.mode === 'payment' ? false : null,
      };
  }
}

export type Derived = {
  account: Account | null;
  program: Program | null;
  fromProgram: Program | null;
  liability: Liability | null;
  category: Category | null;
  cents: number;
  count: number;
  /** Balance entries: what the account held before this count. */
  prevBalance: number;
  prevCountedAt: Date | null;
  /** Liability entries: the balance before this entry, and after it. */
  liabBase: number;
  liabAfter: number;
  /** Whether this payment moves the due date on. */
  roll: boolean;
  /** Transfers: points taken from the source program. */
  transferPoints: number;
};

export function deriveForm(f: EntryFormState, ctx: FormContext, existing: Entry | null): Derived {
  const account = ctx.accounts.find((a) => a.id === f.accountId) ?? null;
  const program = ctx.programs.find((p) => p.id === f.programId) ?? null;
  const fromProgram = ctx.programs.find((p) => p.id === f.fromProgramId) ?? null;
  const liability = ctx.liabilities.find((l) => l.id === f.liabilityId) ?? null;
  const category = ctx.categories.find((c) => c.id === f.categoryId) ?? null;
  const cents = digitsToCents(f.digits);
  const count = digitsToCount(f.digits);

  const sameCount = existing && existing.type === 'balance' && existing.accountId === f.accountId ? existing : null;
  const prevBalance = sameCount ? sameCount.prevBalance : (account?.balance ?? 0);
  const prevCountedAt = sameCount ? sameCount.prevCountedAt : (account?.lastCountedAt ?? null);

  let liabBase = liability?.balance ?? 0;
  if (existing && existing.type === 'liability' && liability && existing.liabilityId === liability.id) {
    liabBase += existing.mode === 'payment' ? existing.amount : -existing.amount;
  }
  const liabAfter = f.liabMode === 'payment' ? liabBase - cents : liabBase + cents;
  const rollAuto = liability ? shouldRoll({ ...liability, balance: liabBase }, cents) : false;
  const roll = f.liabMode === 'payment' && !!liability?.dueDate && (f.roll ?? rollAuto);

  const rate = fromProgram && fromProgram.kind !== 'airline' && fromProgram.rate ? fromProgram.rate : 1;
  const transferPoints = Math.round(count * rate);

  return { account, program, fromProgram, liability, category, cents, count, prevBalance, prevCountedAt, liabBase, liabAfter, roll, transferPoints };
}

export type ProblemCode =
  | 'noCategories'
  | 'pickCategory'
  | 'pickSource'
  | 'amount'
  | 'noAccount'
  | 'balance'
  | 'noProgram'
  | 'pickFrom'
  | 'miles'
  | 'noLiability';

export const PROBLEM_TEXT: Record<ProblemCode, string> = {
  noCategories: 'Add a spending pouch first, like “Food & drinks”.',
  pickCategory: 'Pick a pouch.',
  pickSource: 'Pick where it was paid from.',
  amount: 'Key in the amount.',
  noAccount: 'Add an account to count first.',
  balance: 'Key in the new balance.',
  noProgram: 'Add a miles program first.',
  pickFrom: 'Pick where the points came from.',
  miles: 'Key in the miles.',
  noLiability: 'Add a card or loan first.',
};

/** What still stops the entry being saved, if anything. */
export function formProblem(f: EntryFormState, d: Derived, hasCategories: boolean): ProblemCode | null {
  switch (f.type) {
    case 'expense':
      if (!hasCategories) return 'noCategories';
      if (!d.category) return 'pickCategory';
      if (f.sourceKind !== 'none' && !f.sourceId) return 'pickSource';
      return d.cents > 0 ? null : 'amount';
    case 'balance':
      if (!d.account) return 'noAccount';
      return f.digits === '' ? 'balance' : null;
    case 'miles':
      if (!d.program) return 'noProgram';
      if (f.milesMode === 'transfer' && (!d.fromProgram || f.fromProgramId === f.programId)) return 'pickFrom';
      return d.count > 0 ? null : 'miles';
    case 'liability':
      if (!d.liability) return 'noLiability';
      return d.cents > 0 ? null : 'amount';
  }
}

/** The entry the form will save. */
export function buildDraft(f: EntryFormState, d: Derived, existing: Entry | null): EntryDraft | null {
  const date = atNoon(f.date);
  const note = f.note.trim();
  switch (f.type) {
    case 'expense':
      return {
        type: 'expense',
        date,
        note,
        amount: d.cents,
        categoryId: f.categoryId ?? 'other',
        sourceKind: f.sourceKind,
        sourceId: f.sourceKind === 'none' ? null : f.sourceId,
      };
    case 'balance':
      if (!d.account) return null;
      return { type: 'balance', date, note, accountId: d.account.id, amount: d.cents, prevBalance: d.prevBalance, prevCountedAt: d.prevCountedAt };
    case 'miles': {
      if (!d.program) return null;
      const transfer = f.milesMode === 'transfer';
      return {
        type: 'miles',
        date,
        note,
        mode: f.milesMode,
        programId: d.program.id,
        amount: d.count,
        delta: f.milesMode === 'use' ? -d.count : d.count,
        fromProgramId: transfer ? f.fromProgramId : null,
        fromAmount: transfer ? d.transferPoints : 0,
      };
    }
    case 'liability': {
      const liability = d.liability;
      if (!liability) return null;
      if (f.liabMode === 'charge') {
        return {
          type: 'liability',
          date,
          note,
          mode: 'charge',
          liabilityId: liability.id,
          amount: d.cents,
          fromAccountId: null,
          dueChange: null,
          countsAsInstalment: false,
        };
      }
      const draft = paymentDraft(liability, d.cents, { fromAccountId: f.payFromId, roll: d.roll, date, note });
      // Editing a payment that already moved the due date: keep its original move.
      if (draft.type === 'liability' && d.roll && existing && existing.type === 'liability' && existing.liabilityId === liability.id && existing.dueChange) {
        return { ...draft, dueChange: existing.dueChange, countsAsInstalment: existing.countsAsInstalment };
      }
      return draft;
    }
  }
}
