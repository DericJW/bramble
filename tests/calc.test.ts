import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  goalProgress,
  groupAccounts,
  homeTip,
  liabilitySummary,
  loanProgress,
  milesSummary,
  moneyTip,
  monthStats,
  pouchStats,
  shareLabel,
  upcoming,
  worthOf,
} from '../src/data/calc';
import { sampleFarm } from '../src/data/defaults';
import { planChange } from '../src/data/effects';
import type { Entry } from '../src/data/types';
import { formatShortMonthYear } from '../src/lib/dates';
import { formatMoney } from '../src/lib/money';

// The design mock-ups are set on Friday 16 October 2026, in the morning.
const NOW = new Date(2026, 9, 16, 9, 0);
const farm = sampleFarm(NOW);
const entries = farm.entries.map((e) => ({ ...e, createdAt: null }) as Entry);
const money = (c: number) => formatMoney(c, 'SGD');

describe('the sample farm matches the design', () => {
  test('net worth', () => {
    const w = worthOf(farm.accounts, farm.liabilities);
    assert.equal(money(w.assets), 'S$58,664.95');
    assert.equal(money(w.owed), 'S$23,646.55');
    assert.equal(money(w.net), 'S$35,018.40');
    assert.equal(money(w.net - farm.monthStartNet), 'S$1,240.10');
  });

  test('money jars', () => {
    const groups = groupAccounts(farm.accounts);
    assert.deepEqual(
      groups.map((g) => [g.kind, money(g.total), shareLabel(g.share)]),
      [
        ['bank', 'S$40,064.60', '68%'],
        ['investment', 'S$18,420.35', '31%'],
        ['cash', 'S$180.00', 'under 1%'],
      ],
    );
  });

  test('miles', () => {
    const m = milesSummary(farm.programs);
    assert.equal(m.total, 127630);
    assert.equal(m.fromPoints, 16480);
    const goal = goalProgress(farm.settings.goal, farm.programs);
    assert.ok(goal);
    assert.equal(goal.pct, 72);
    assert.equal(goal.toGo, 33600);
  });

  test('this month’s spending', () => {
    const stats = monthStats(entries, farm.categories, NOW, NOW);
    assert.equal(money(stats.spent), 'S$1,486.30');
    assert.equal(money(stats.budget), 'S$2,500.00');
    assert.equal(money(stats.left), 'S$1,013.70');
    assert.equal(stats.pct, 59);
    assert.equal(stats.daysLeft, 16);
    assert.equal(money(stats.perDay), 'S$63.36');
    assert.equal(money(stats.spentToday), 'S$24.80');
  });

  test('pouches', () => {
    const stats = monthStats(entries, farm.categories, NOW, NOW);
    const pouches = pouchStats(farm.categories, stats.byCategory);
    const byId = Object.fromEntries(pouches.map((p) => [p.id, p]));
    assert.equal(money(byId.food.spent), 'S$412.80');
    assert.equal(byId.food.pct, 59);
    assert.equal(money(byId.transport.spent), 'S$186.50');
    assert.equal(byId.transport.pct, 75);
    assert.equal(money(byId.groceries.spent), 'S$238.40');
    assert.equal(money(byId.bills.spent), 'S$324.00');
    assert.equal(byId.bills.status, 'near');
    assert.equal(money(byId.bills.left), 'S$76.00');
    assert.equal(money(byId.shopping.spent), 'S$214.60');
    assert.equal(money(byId.fun.spent), 'S$110.00');
  });

  test('liabilities', () => {
    const s = liabilitySummary(farm.liabilities, NOW);
    assert.equal(money(s.dueSoonTotal), 'S$2,576.55');
    assert.deepEqual(
      s.byKind.map((k) => [k.kind, shareLabel(k.share)]),
      [
        ['loan', '91%'],
        ['card', '8%'],
        ['personal', '1%'],
      ],
    );
    assert.equal(s.dueSoon[0].name, 'Visa card');
    const car = farm.liabilities.find((l) => l.id === 'sample-car');
    assert.ok(car);
    const loan = loanProgress(car);
    assert.ok(loan);
    assert.equal(loan.made, 52);
    assert.equal(loan.pct, 62);
    assert.ok(loan.endDate);
    assert.equal(formatShortMonthYear(loan.endDate), 'Jun 2029');
  });

  test('coming up', () => {
    const items = upcoming(farm.liabilities, farm.programs, NOW);
    assert.deepEqual(
      items.map((i) => (i.kind === 'due' ? i.liability.name : `${i.program.name} expiry`)),
      ['Visa card', 'Car loan', 'Mastercard', 'KrisFlyer expiry'],
    );
  });

  test('Bramble’s notes', () => {
    const stats = monthStats(entries, farm.categories, NOW, NOW);
    const tip = homeTip({ now: NOW, currency: 'SGD', hidden: false, stats, liabilities: farm.liabilities, hasAnything: true })
      .map((p) => p.text)
      .join('');
    assert.equal(tip, 'Morning! You can spend S$63.36 a day for 16 more days and stay on budget. Your Visa card is due on the 28th.');

    const evening = new Date(2026, 9, 16, 20, 0);
    const night = homeTip({ now: evening, currency: 'SGD', hidden: false, stats: monthStats(entries, farm.categories, evening, evening), liabilities: farm.liabilities, hasAnything: true })
      .map((p) => p.text)
      .join('');
    assert.equal(night, 'Evening! You spent S$24.80 today, well under your S$64.91 daily allowance. Sleep tight!');

    const jars = moneyTip(farm.accounts, NOW, 14)
      .map((p) => p.text)
      .join('');
    assert.equal(jars, 'Two jars haven’t been counted in over two weeks. Your Emergency fund and Brokerage could use a fresh count!'.replace('’', "'"));
  });

  test('every sample entry points at something that exists', () => {
    const state = { accounts: farm.accounts, liabilities: farm.liabilities, programs: farm.programs };
    for (const e of farm.entries) {
      const plan = planChange(state, null, e);
      const expected = e.type === 'expense' && e.sourceKind === 'none' ? 0 : 1;
      assert.ok(plan.increments.length >= expected, `entry ${e.id} has effects`);
      if (e.type === 'expense') assert.ok(farm.categories.some((c) => c.id === e.categoryId), `${e.id} category`);
    }
  });
});

describe('edge cases', () => {
  test('a past month has no days left', () => {
    const stats = monthStats(entries, farm.categories, new Date(2026, 8, 1), NOW);
    assert.equal(stats.daysLeft, 0);
    assert.equal(stats.perDay, 0);
    assert.equal(stats.spent, 0);
  });

  test('spending in a removed pouch lands in Other', () => {
    const extra: Entry = {
      id: 'x',
      type: 'expense',
      date: NOW,
      note: '',
      createdAt: null,
      amount: 500,
      categoryId: 'gone',
      sourceKind: 'none',
      sourceId: null,
    };
    const stats = monthStats([...entries, extra], farm.categories, NOW, NOW);
    const pouches = pouchStats(farm.categories, stats.byCategory);
    const other = pouches.find((p) => p.orphan);
    assert.ok(other);
    assert.equal(other.spent, 500);
  });

  test('an empty farm', () => {
    const stats = monthStats([], [], NOW, NOW);
    assert.equal(stats.budget, 0);
    const tip = homeTip({ now: NOW, currency: 'SGD', hidden: false, stats, liabilities: [], hasAnything: false });
    assert.ok(tip.map((p) => p.text).join('').startsWith('Hi, I'));
    assert.deepEqual(liabilitySummary([], NOW).dueSoon, []);
    assert.equal(milesSummary([]).total, 0);
  });
});
