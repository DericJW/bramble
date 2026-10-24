/**
 * Starting points: the pouches a new farm begins with, and the sample farm from the
 * design mock-ups (so you can look around before keying in your own numbers).
 */
import { addDays, addMonths, atNoon, startOfMonth } from '../lib/dates';
import type { Account, Category, EntryDraft, Liability, Program, Settings } from './types';

export type CategorySeed = Omit<Category, 'id'> & { id: string };

export const DEFAULT_CATEGORIES: CategorySeed[] = [
  { id: 'food', name: 'Food & drinks', icon: 'onigiri', budget: 0, order: 0 },
  { id: 'transport', name: 'Transport', icon: 'tram', budget: 0, order: 1 },
  { id: 'groceries', name: 'Groceries', icon: 'basket', budget: 0, order: 2 },
  { id: 'bills', name: 'Bills & utilities', icon: 'lantern', budget: 0, order: 3 },
  { id: 'shopping', name: 'Shopping', icon: 'bag', budget: 0, order: 4 },
  { id: 'fun', name: 'Entertainment', icon: 'funTicket', budget: 0, order: 5 },
  { id: 'health', name: 'Health', icon: 'cross', budget: 0, order: 6 },
  { id: 'other', name: 'Other', icon: 'sparkle', budget: 0, order: 7 },
];

export type SampleFarm = {
  settings: Settings;
  accounts: Account[];
  programs: Program[];
  liabilities: Liability[];
  categories: Category[];
  entries: (EntryDraft & { id: string })[];
  /** Net worth at the start of the month, so the home screen shows a change. */
  monthStartNet: number;
};

const S = (dollars: number) => Math.round(dollars * 100);

/** The farm from the design, with dates moved to around `now`. */
export function sampleFarm(now: Date): SampleFarm {
  const today = atNoon(now);
  const ago = (days: number) => atNoon(addDays(today, -days));
  const ahead = (days: number) => atNoon(addDays(today, days));
  const monthStart = startOfMonth(today);
  const dayOfMonth = today.getDate();
  /** A day earlier this month, spreading sample spending evenly across the days so far. */
  const spread = (i: number, count: number) => {
    if (dayOfMonth <= 2) return atNoon(monthStart);
    const day = 1 + Math.floor((i * (dayOfMonth - 2)) / Math.max(1, count));
    return atNoon(new Date(today.getFullYear(), today.getMonth(), day));
  };

  const accounts: Account[] = [
    { id: 'sample-main', name: 'Main savings', kind: 'bank', icon: 'bank', balance: S(24850), lastCountedAt: ago(2), order: 0 },
    { id: 'sample-daily', name: 'Daily spending', kind: 'bank', icon: 'coin', balance: S(3214.6), lastCountedAt: today, order: 1 },
    { id: 'sample-emergency', name: 'Emergency fund', kind: 'bank', icon: 'chest', balance: S(12000), lastCountedAt: ago(15), order: 2 },
    { id: 'sample-brokerage', name: 'Brokerage', kind: 'investment', icon: 'sprout', balance: S(18420.35), lastCountedAt: ago(16), order: 3 },
    { id: 'sample-wallet', name: 'Wallet', kind: 'cash', icon: 'pouch', balance: S(180), lastCountedAt: today, order: 4 },
  ];

  const nextYearMarch = new Date(today.getFullYear() + (today.getMonth() >= 2 ? 1 : 0), 2, 31, 12);
  const programs: Program[] = [
    {
      id: 'sample-kf',
      name: 'KrisFlyer',
      kind: 'airline',
      icon: 'plane',
      balance: 86400,
      rate: null,
      expiringAmount: 12000,
      expiringOn: nextYearMarch,
      updatedAt: ago(2),
      order: 0,
    },
    { id: 'sample-am', name: 'Asia Miles', kind: 'airline', icon: 'planeTeal', balance: 24750, rate: null, expiringAmount: null, expiringOn: null, updatedAt: ago(14), order: 1 },
    { id: 'sample-pts', name: 'Card rewards', kind: 'points', icon: 'star', balance: 41200, rate: 2.5, expiringAmount: null, expiringOn: null, updatedAt: ago(4), order: 2 },
  ];

  const firstOfNext = atNoon(addMonths(monthStart, 1));
  const liabilities: Liability[] = [
    {
      id: 'sample-visa',
      name: 'Visa card',
      kind: 'card',
      icon: 'card',
      balance: S(1284.4),
      dueDate: ahead(12),
      repeatsMonthly: true,
      dueAmount: null,
      termPayments: null,
      paymentsMade: null,
      payFromAccountId: 'sample-daily',
      note: '',
      order: 0,
    },
    {
      id: 'sample-master',
      name: 'Mastercard',
      kind: 'card',
      icon: 'cardOrange',
      balance: S(612.15),
      dueDate: ahead(18),
      repeatsMonthly: true,
      dueAmount: null,
      termPayments: null,
      paymentsMade: null,
      payFromAccountId: 'sample-daily',
      note: '',
      order: 1,
    },
    {
      id: 'sample-car',
      name: 'Car loan',
      kind: 'loan',
      icon: 'car',
      balance: S(21600),
      dueDate: firstOfNext,
      repeatsMonthly: true,
      dueAmount: S(680),
      termPayments: 84,
      paymentsMade: 52,
      payFromAccountId: 'sample-main',
      note: '',
      order: 2,
    },
    {
      id: 'sample-natasha',
      name: 'Owed to Natasha',
      kind: 'personal',
      icon: 'letter',
      balance: S(150),
      dueDate: null,
      repeatsMonthly: false,
      dueAmount: null,
      termPayments: null,
      paymentsMade: null,
      payFromAccountId: null,
      note: 'Concert tickets',
      order: 3,
    },
  ];

  const categories: Category[] = [
    { id: 'food', name: 'Food & drinks', icon: 'onigiri', budget: S(700), order: 0 },
    { id: 'transport', name: 'Transport', icon: 'tram', budget: S(250), order: 1 },
    { id: 'groceries', name: 'Groceries', icon: 'basket', budget: S(400), order: 2 },
    { id: 'bills', name: 'Bills & utilities', icon: 'lantern', budget: S(400), order: 3 },
    { id: 'shopping', name: 'Shopping', icon: 'bag', budget: S(450), order: 4 },
    { id: 'fun', name: 'Entertainment', icon: 'funTicket', budget: S(300), order: 5 },
  ];

  type Spend = [note: string, dollars: number, category: string, source: string];
  const earlier: Spend[] = [
    ['Brunch with Mei', 38.6, 'food', 'sample-daily'],
    ['Electricity', 118, 'bills', 'sample-main'],
    ['Grab to the airport', 32.5, 'transport', 'sample-visa'],
    ['Fresh market', 46.3, 'groceries', 'sample-wallet'],
    ['Hawker lunches', 64.2, 'food', 'sample-daily'],
    ['New sneakers', 129, 'shopping', 'sample-visa'],
    ['Mobile plan', 38, 'bills', 'sample-daily'],
    ['Movie night', 28, 'fun', 'sample-daily'],
    ['Bubble tea', 6.8, 'food', 'sample-wallet'],
    ['MRT top-up', 20, 'transport', 'sample-daily'],
    ['Supermarket top-up', 52.15, 'groceries', 'sample-daily'],
    ['Pizza night', 46, 'food', 'sample-master'],
    ['Internet', 49, 'bills', 'sample-daily'],
    ['Petrol', 74, 'transport', 'sample-daily'],
    ['Phone case', 25.6, 'shopping', 'sample-daily'],
    ['Coffee beans', 32, 'food', 'sample-daily'],
    ['Board game café', 42, 'fun', 'sample-master'],
    ['Fruit and veg', 28.5, 'groceries', 'sample-wallet'],
    ['Water', 34, 'bills', 'sample-daily'],
    ['Team lunch', 28.4, 'food', 'sample-daily'],
    ['Parking', 18, 'transport', 'sample-daily'],
    ['Gift for Mum', 60, 'shopping', 'sample-master'],
    ['Dim sum Sunday', 72, 'food', 'sample-visa'],
    ['Home insurance', 85, 'bills', 'sample-main'],
    ['Pantry restock', 43, 'groceries', 'sample-daily'],
    ['Bowling', 40, 'fun', 'sample-daily'],
    ['Bakery run', 14.6, 'food', 'sample-wallet'],
    ['Taxi home', 22, 'transport', 'sample-daily'],
    ['Dinner date', 63.4, 'food', 'sample-visa'],
  ];

  const sourceKind = (id: string) => (id.startsWith('sample-visa') || id.startsWith('sample-master') ? 'liability' : 'account');

  const entries: (EntryDraft & { id: string })[] = [];
  earlier.forEach(([note, dollars, categoryId, source], i) => {
    entries.push({
      id: `sample-exp-${i}`,
      type: 'expense',
      date: spread(i, earlier.length),
      note,
      amount: S(dollars),
      categoryId,
      sourceKind: sourceKind(source),
      sourceId: source,
    });
  });
  const recent: [string, number, string, string, Date][] = [
    ['Kopi & toast', 4.8, 'food', 'sample-daily', today],
    ['MRT top-up', 20, 'transport', 'sample-daily', today],
    ['Weekly groceries', 68.45, 'groceries', 'sample-daily', dayOfMonth > 1 ? ago(1) : today],
    ['Dinner with friends', 42, 'food', 'sample-visa', dayOfMonth > 1 ? ago(1) : today],
  ];
  recent.forEach(([note, dollars, categoryId, source, date], i) => {
    entries.push({
      id: `sample-exp-r${i}`,
      type: 'expense',
      date,
      note,
      amount: S(dollars),
      categoryId,
      sourceKind: sourceKind(source),
      sourceId: source,
    });
  });

  entries.push(
    {
      id: 'sample-mi-1',
      type: 'miles',
      date: ago(2),
      note: 'Card points transfer',
      mode: 'transfer',
      programId: 'sample-kf',
      amount: 1240,
      delta: 1240,
      fromProgramId: 'sample-pts',
      fromAmount: 3100,
    },
    {
      id: 'sample-mi-2',
      type: 'miles',
      date: ago(18),
      note: 'Flight SIN–BKK',
      mode: 'earn',
      programId: 'sample-am',
      amount: 3412,
      delta: 3412,
      fromProgramId: null,
      fromAmount: 0,
    },
    {
      id: 'sample-mi-3',
      type: 'miles',
      date: ago(44),
      note: 'Award redemption',
      mode: 'use',
      programId: 'sample-kf',
      amount: 25000,
      delta: -25000,
      fromProgramId: null,
      fromAmount: 0,
    },
    {
      id: 'sample-bal-1',
      type: 'balance',
      date: ago(2),
      note: '',
      accountId: 'sample-main',
      amount: S(24850),
      prevBalance: S(24580),
      prevCountedAt: ago(30),
    },
    {
      id: 'sample-liab-1',
      type: 'liability',
      date: ago(19),
      note: 'Last month’s statement',
      mode: 'payment',
      liabilityId: 'sample-visa',
      amount: S(980),
      fromAccountId: 'sample-daily',
      dueChange: null,
      countsAsInstalment: false,
    },
  );

  const assets = accounts.reduce((t, a) => t + a.balance, 0);
  const owed = liabilities.reduce((t, l) => t + l.balance, 0);

  return {
    settings: { currency: 'SGD', countEveryDays: 14, goal: { label: 'Japan trip', programId: 'sample-kf', target: 120000 } },
    accounts,
    programs,
    liabilities,
    categories,
    entries,
    monthStartNet: assets - owed - S(1240.1),
  };
}
