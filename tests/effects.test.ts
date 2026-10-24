import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { dueChangeFor, planChange, refsOf, type EffectState } from '../src/data/effects';
import type { BalanceEntry, Entry, EntryDraft, ExpenseEntry, LiabilityEntry, MilesEntry } from '../src/data/types';

const noon = (m: number, d: number) => new Date(2026, m, d, 12);

const state: EffectState = {
  accounts: [
    { id: 'daily', lastCountedAt: noon(9, 10) },
    { id: 'main', lastCountedAt: noon(9, 14) },
  ],
  liabilities: [
    { id: 'visa', dueDate: noon(9, 28) },
    { id: 'car', dueDate: noon(10, 1) },
  ],
  programs: [{ id: 'kf' }, { id: 'pts' }],
};

const expense = (over: Partial<ExpenseEntry> = {}): ExpenseEntry => ({
  id: 'e1',
  type: 'expense',
  date: noon(9, 16),
  note: '',
  createdAt: null,
  amount: 480,
  categoryId: 'food',
  sourceKind: 'account',
  sourceId: 'daily',
  ...over,
});

describe('entry effects', () => {
  test('an expense from an account lowers its balance', () => {
    const plan = planChange(state, null, expense());
    assert.deepEqual(plan.increments, [{ coll: 'accounts', id: 'daily', field: 'balance', delta: -480 }]);
    assert.deepEqual(plan.sets, []);
  });

  test('an expense on a card raises what you owe', () => {
    const plan = planChange(state, null, expense({ sourceKind: 'liability', sourceId: 'visa' }));
    assert.deepEqual(plan.increments, [{ coll: 'liabilities', id: 'visa', field: 'balance', delta: 480 }]);
  });

  test('an untracked expense changes nothing', () => {
    const plan = planChange(state, null, expense({ sourceKind: 'none', sourceId: null }));
    assert.deepEqual(plan.increments, []);
  });

  test('deleting an expense puts the money back', () => {
    const plan = planChange(state, expense(), null);
    assert.deepEqual(plan.increments, [{ coll: 'accounts', id: 'daily', field: 'balance', delta: 480 }]);
  });

  test('editing an amount applies only the difference', () => {
    const plan = planChange(state, expense(), expense({ amount: 600 }));
    assert.deepEqual(plan.increments, [{ coll: 'accounts', id: 'daily', field: 'balance', delta: -120 }]);
  });

  test('moving an expense to another account moves the money', () => {
    const plan = planChange(state, expense(), expense({ sourceId: 'main' }));
    assert.deepEqual(
      plan.increments.sort((a, b) => a.id.localeCompare(b.id)),
      [
        { coll: 'accounts', id: 'daily', field: 'balance', delta: 480 },
        { coll: 'accounts', id: 'main', field: 'balance', delta: -480 },
      ],
    );
  });

  test('effects on removed accounts are skipped', () => {
    const plan = planChange(state, null, expense({ sourceId: 'gone' }));
    assert.deepEqual(plan.increments, []);
  });

  test('a recount sets the balance by its difference and marks it counted', () => {
    const count: BalanceEntry = {
      id: 'b1',
      type: 'balance',
      date: noon(9, 16),
      note: '',
      createdAt: null,
      accountId: 'main',
      amount: 2485000,
      prevBalance: 2458000,
      prevCountedAt: noon(9, 14),
    };
    const plan = planChange(state, null, count);
    assert.deepEqual(plan.increments, [{ coll: 'accounts', id: 'main', field: 'balance', delta: 27000 }]);
    assert.deepEqual(plan.sets, [{ coll: 'accounts', id: 'main', field: 'lastCountedAt', value: noon(9, 16) }]);

    const after: EffectState = { ...state, accounts: [{ id: 'daily', lastCountedAt: noon(9, 10) }, { id: 'main', lastCountedAt: noon(9, 16) }] };
    const undo = planChange(after, count, null);
    assert.deepEqual(undo.increments, [{ coll: 'accounts', id: 'main', field: 'balance', delta: -27000 }]);
    assert.deepEqual(undo.sets, [{ coll: 'accounts', id: 'main', field: 'lastCountedAt', value: noon(9, 14) }]);
  });

  test('an older count does not move "last counted" backwards', () => {
    const old: EntryDraft = {
      type: 'balance',
      date: noon(9, 1),
      note: '',
      accountId: 'main',
      amount: 100,
      prevBalance: 100,
      prevCountedAt: null,
    };
    assert.deepEqual(planChange(state, null, old).sets, []);
  });

  test('miles transfers move points out and miles in', () => {
    const transfer: MilesEntry = {
      id: 'm1',
      type: 'miles',
      date: noon(9, 14),
      note: '',
      createdAt: null,
      mode: 'transfer',
      programId: 'kf',
      amount: 1240,
      delta: 1240,
      fromProgramId: 'pts',
      fromAmount: 3100,
    };
    const plan = planChange(state, null, transfer);
    assert.deepEqual(plan.increments, [
      { coll: 'programs', id: 'kf', field: 'balance', delta: 1240 },
      { coll: 'programs', id: 'pts', field: 'balance', delta: -3100 },
    ]);
  });

  test('paying a loan from an account rolls the due date and counts an instalment', () => {
    const due = dueChangeFor({ dueDate: noon(10, 1), repeatsMonthly: true }, true);
    assert.ok(due);
    assert.equal(due.next?.getMonth(), 11);
    const pay: LiabilityEntry = {
      id: 'p1',
      type: 'liability',
      date: noon(9, 16),
      note: '',
      createdAt: null,
      mode: 'payment',
      liabilityId: 'car',
      amount: 68000,
      fromAccountId: 'main',
      dueChange: due,
      countsAsInstalment: true,
    };
    const plan = planChange(state, null, pay);
    assert.deepEqual(plan.increments, [
      { coll: 'liabilities', id: 'car', field: 'balance', delta: -68000 },
      { coll: 'accounts', id: 'main', field: 'balance', delta: -68000 },
      { coll: 'liabilities', id: 'car', field: 'paymentsMade', delta: 1 },
    ]);
    assert.deepEqual(plan.sets, [{ coll: 'liabilities', id: 'car', field: 'dueDate', value: due.next }]);

    // Undo after the due date moved: it moves back.
    const rolled: EffectState = { ...state, liabilities: [{ id: 'visa', dueDate: noon(9, 28) }, { id: 'car', dueDate: due.next }] };
    const undo = planChange(rolled, pay, null);
    assert.deepEqual(undo.sets, [{ coll: 'liabilities', id: 'car', field: 'dueDate', value: noon(10, 1) }]);
    assert.ok(undo.increments.some((i) => i.field === 'paymentsMade' && i.delta === -1));

    // Editing the amount keeps the date where it is.
    const edit = planChange(rolled, pay, { ...pay, amount: 70000 });
    assert.deepEqual(edit.sets, [{ coll: 'liabilities', id: 'car', field: 'dueDate', value: due.next }]);
    assert.deepEqual(
      edit.increments.sort((a, b) => a.id.localeCompare(b.id)),
      [
        { coll: 'liabilities', id: 'car', field: 'balance', delta: -2000 },
        { coll: 'accounts', id: 'main', field: 'balance', delta: -2000 },
      ].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });

  test('settling a one-off debt clears its due date', () => {
    const due = dueChangeFor({ dueDate: noon(9, 30), repeatsMonthly: false }, true);
    assert.deepEqual(due, { prev: noon(9, 30), next: null });
    assert.equal(dueChangeFor({ dueDate: null, repeatsMonthly: true }, true), null);
    assert.equal(dueChangeFor({ dueDate: noon(9, 30), repeatsMonthly: true }, false), null);
  });

  test('refs list what an entry points at', () => {
    assert.deepEqual(refsOf(expense()), ['food', 'daily']);
    const e: Entry = expense({ sourceKind: 'none', sourceId: null });
    assert.deepEqual(refsOf(e), ['food']);
  });
});
