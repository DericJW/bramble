/**
 * The shapes the app works with. Money is in integer cents, miles and points are whole
 * numbers, and dates are JS Dates.
 *
 * Everything is kept on the device (see store.ts) as one farm:
 *   settings      Settings
 *   accounts      Account      (money you have)
 *   programs      Program      (miles and points)
 *   liabilities   Liability    (cards, loans, IOUs)
 *   categories    Category     (spending pouches with a monthly budget)
 *   entries       Entry        (everything you key in)
 *   snapshots     Snapshot     (net worth at the start of each month)
 */

export type AccountKind = 'bank' | 'investment' | 'cash';
export type ProgramKind = 'airline' | 'hotel' | 'points';
export type LiabilityKind = 'card' | 'loan' | 'personal';
export type EntryType = 'expense' | 'balance' | 'miles' | 'liability';

export type Account = {
  id: string;
  name: string;
  kind: AccountKind;
  icon: string;
  /** Cents. */
  balance: number;
  lastCountedAt: Date | null;
  order: number;
};

export type Program = {
  id: string;
  name: string;
  kind: ProgramKind;
  icon: string;
  /** Miles or points, whole number. */
  balance: number;
  /** Points needed for one mile, for card points (e.g. 2.5). Null when it does not apply. */
  rate: number | null;
  expiringAmount: number | null;
  expiringOn: Date | null;
  updatedAt: Date | null;
  order: number;
};

export type Liability = {
  id: string;
  name: string;
  kind: LiabilityKind;
  icon: string;
  /** Cents still owed. */
  balance: number;
  /** Next due date, if there is one. */
  dueDate: Date | null;
  /** Card statements and loan instalments come round every month. */
  repeatsMonthly: boolean;
  /** Cents due on the next due date (statement amount or instalment). Null means the whole balance. */
  dueAmount: number | null;
  /** Loans: total number of instalments and how many are paid. */
  termPayments: number | null;
  paymentsMade: number | null;
  /** Account that usually pays this off, used by "Mark as paid". */
  payFromAccountId: string | null;
  note: string;
  order: number;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  /** Monthly budget in cents. 0 means no limit. */
  budget: number;
  order: number;
};

export type SourceKind = 'account' | 'liability' | 'none';

/** A due date that an entry moved, so deleting the entry can move it back. */
export type DueChange = { prev: Date | null; next: Date | null };

type EntryBase = {
  id: string;
  /** The day it happened, stored at local noon. */
  date: Date;
  note: string;
  createdAt: Date | null;
};

export type ExpenseEntry = EntryBase & {
  type: 'expense';
  /** Cents spent, always positive. */
  amount: number;
  categoryId: string;
  /** Where the money came from: an account (its balance goes down), a card (what you owe goes up) or nowhere tracked. */
  sourceKind: SourceKind;
  sourceId: string | null;
};

export type BalanceEntry = EntryBase & {
  type: 'balance';
  accountId: string;
  /** The new balance in cents. */
  amount: number;
  /** Balance before this count, so the change can be shown and undone. */
  prevBalance: number;
  prevCountedAt: Date | null;
};

export type MilesMode = 'earn' | 'use' | 'transfer';

export type MilesEntry = EntryBase & {
  type: 'miles';
  mode: MilesMode;
  programId: string;
  /** The number typed in: miles earned, used, or received in a transfer. Always positive. */
  amount: number;
  /** Signed change applied to programId. */
  delta: number;
  /** Transfers only: the program the points came from and how many were taken. */
  fromProgramId: string | null;
  fromAmount: number;
};

export type LiabilityMode = 'payment' | 'charge';

export type LiabilityEntry = EntryBase & {
  type: 'liability';
  mode: LiabilityMode;
  liabilityId: string;
  /** Cents, always positive. */
  amount: number;
  /** Payments only: the account the money left from, if you want its balance updated. */
  fromAccountId: string | null;
  /** Set when this payment moved the due date on (or cleared it). */
  dueChange: DueChange | null;
  /** Loans: this payment counted as one of the instalments. */
  countsAsInstalment: boolean;
};

export type Entry = ExpenseEntry | BalanceEntry | MilesEntry | LiabilityEntry;

/** An entry before it has an id (what the entry form produces). */
export type EntryDraft =
  | Omit<ExpenseEntry, 'id' | 'createdAt'>
  | Omit<BalanceEntry, 'id' | 'createdAt'>
  | Omit<MilesEntry, 'id' | 'createdAt'>
  | Omit<LiabilityEntry, 'id' | 'createdAt'>;

export type MilesGoal = {
  label: string;
  /** Null means "all my miles". */
  programId: string | null;
  target: number;
};

export type Settings = {
  currency: string;
  /** Accounts not counted for this many days get a "Count due" badge. */
  countEveryDays: number;
  goal: MilesGoal | null;
};

export type Snapshot = {
  month: string;
  assets: number;
  liabilities: number;
  net: number;
  takenAt: Date | null;
};

/** Everything the screens read, in one place. */
export type DataState = {
  settings: Settings;
  accounts: Account[];
  programs: Program[];
  liabilities: Liability[];
  categories: Category[];
};
