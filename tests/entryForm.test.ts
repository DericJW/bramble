import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { sampleFarm } from '../src/data/defaults';
import { planChange } from '../src/data/effects';
import { buildDraft, deriveForm, formProblem, initialForm, type EntryFormState, type FormPrefs } from '../src/data/entryForm';
import type { Entry, LiabilityEntry } from '../src/data/types';

const NOW = new Date(2026, 9, 16, 9, 0);
const farm = sampleFarm(NOW);
const ctx = { accounts: farm.accounts, programs: farm.programs, liabilities: farm.liabilities, categories: farm.categories };
const noPrefs: FormPrefs = { lastSource: null, lastCategoryId: null, lastProgramId: null, lastPayFromId: null };
const state = { accounts: farm.accounts, liabilities: farm.liabilities, programs: farm.programs };

function form(params: Record<string, string>, patch: Partial<EntryFormState> = {}, existing: Entry | null = null) {
  const f = { ...initialForm(params, existing, ctx, noPrefs, 2, NOW), ...patch };
  const d = deriveForm(f, ctx, existing);
  return { f, d, problem: formProblem(f, d, ctx.categories.length > 0), draft: buildDraft(f, d, existing) };
}

describe('entry form', () => {
  test('a new expense starts with the first pouch and account', () => {
    const { f, problem } = form({});
    assert.equal(f.type, 'expense');
    assert.equal(f.categoryId, 'food');
    assert.equal(f.sourceKind, 'account');
    assert.equal(f.sourceId, 'sample-main');
    assert.equal(problem, 'amount');
  });

  test('remembers the last place you paid from', () => {
    const f = initialForm({}, null, ctx, { ...noPrefs, lastSource: { kind: 'liability', id: 'sample-visa' } }, 2, NOW);
    assert.equal(f.sourceKind, 'liability');
    assert.equal(f.sourceId, 'sample-visa');
    const gone = initialForm({}, null, ctx, { ...noPrefs, lastSource: { kind: 'account', id: 'deleted' } }, 2, NOW);
    assert.equal(gone.sourceId, 'sample-main');
  });

  test('saves an expense', () => {
    const { draft, problem } = form({}, { digits: '24.5', note: '  lunch  ', sourceId: 'sample-daily' });
    assert.equal(problem, null);
    assert.deepEqual(draft, {
      type: 'expense',
      date: new Date(2026, 9, 16, 12),
      note: 'lunch',
      amount: 2450,
      categoryId: 'food',
      sourceKind: 'account',
      sourceId: 'sample-daily',
    });
  });

  test('a recount knows the old balance', () => {
    const { d, draft } = form({ type: 'balance', account: 'sample-main' }, { digits: '25120' });
    assert.equal(d.prevBalance, 2485000);
    assert.ok(draft && draft.type === 'balance');
    assert.equal(draft.amount, 2512000);
    const plan = planChange(state, null, draft);
    assert.deepEqual(plan.increments, [{ coll: 'accounts', id: 'sample-main', field: 'balance', delta: 27000 }]);
  });

  test('a balance of zero can be saved, an empty one cannot', () => {
    assert.equal(form({ type: 'balance' }, { digits: '0' }).problem, null);
    assert.equal(form({ type: 'balance' }, { digits: '' }).problem, 'balance');
  });

  test('miles: earned, redeemed and transferred', () => {
    const earn = form({ type: 'miles', program: 'sample-kf' }, { digits: '1240' }).draft;
    assert.ok(earn && earn.type === 'miles');
    assert.equal(earn.delta, 1240);
    const use = form({ type: 'miles', program: 'sample-kf', mode: 'use' }, { digits: '25000' }).draft;
    assert.ok(use && use.type === 'miles');
    assert.equal(use.delta, -25000);
    const t = form({ type: 'miles', program: 'sample-kf', mode: 'transfer' }, { digits: '1240' });
    assert.equal(t.f.fromProgramId, 'sample-pts');
    assert.ok(t.draft && t.draft.type === 'miles');
    assert.equal(t.draft.fromAmount, 3100);
    assert.equal(t.draft.fromProgramId, 'sample-pts');
    const same = form({ type: 'miles', program: 'sample-kf', mode: 'transfer' }, { digits: '10', fromProgramId: 'sample-kf' });
    assert.equal(same.problem, 'pickFrom');
  });

  test('paying the full statement moves the due date on', () => {
    const { f, d, draft } = form({ type: 'liability' }, { digits: '1284.40' });
    assert.equal(f.liabilityId, 'sample-visa');
    assert.equal(f.payFromId, 'sample-daily');
    assert.equal(d.roll, true);
    assert.equal(d.liabAfter, 0);
    assert.ok(draft && draft.type === 'liability');
    assert.equal(draft.dueChange?.next?.getMonth(), 10);
    assert.equal(draft.fromAccountId, 'sample-daily');
    assert.equal(draft.countsAsInstalment, false);
  });

  test('a part payment leaves the due date unless asked', () => {
    const part = form({ type: 'liability' }, { digits: '100' });
    assert.equal(part.d.roll, false);
    assert.ok(part.draft && part.draft.type === 'liability');
    assert.equal(part.draft.dueChange, null);
    const forced = form({ type: 'liability' }, { digits: '100', roll: true });
    assert.equal(forced.d.roll, true);
  });

  test('a loan instalment counts towards the term', () => {
    const { draft } = form({ type: 'liability', liability: 'sample-car' }, { digits: '680' });
    assert.ok(draft && draft.type === 'liability');
    assert.equal(draft.countsAsInstalment, true);
    assert.ok(draft.dueChange);
  });

  test('a new charge raises what is owed', () => {
    const { d, draft } = form({ type: 'liability', liability: 'sample-visa', mode: 'charge' }, { digits: '42' });
    assert.equal(d.liabAfter, 128440 + 4200);
    assert.ok(draft && draft.type === 'liability');
    assert.equal(draft.mode, 'charge');
    assert.equal(draft.dueChange, null);
  });

  test('editing a payment keeps its original due-date move', () => {
    const existing: LiabilityEntry = {
      id: 'p',
      type: 'liability',
      mode: 'payment',
      liabilityId: 'sample-visa',
      amount: 128440,
      fromAccountId: 'sample-daily',
      dueChange: { prev: new Date(2026, 8, 28, 12), next: new Date(2026, 9, 28, 12) },
      countsAsInstalment: false,
      date: new Date(2026, 8, 25, 12),
      note: '',
      createdAt: null,
    };
    const { f, d, draft } = form({ id: 'p' }, {}, existing);
    assert.equal(f.digits, '1284.4');
    assert.equal(f.roll, true);
    assert.equal(d.liabBase, 128440 * 2);
    assert.ok(draft && draft.type === 'liability');
    assert.deepEqual(draft.dueChange, existing.dueChange);
    assert.equal(draft.date.getDate(), 25);
  });

  test('nothing to pick from asks you to add one', () => {
    const empty = { accounts: [], programs: [], liabilities: [], categories: [] };
    const f = initialForm({ type: 'miles' }, null, empty, noPrefs, 2, NOW);
    assert.equal(formProblem(f, deriveForm(f, empty, null), false), 'noProgram');
    const e = initialForm({}, null, empty, noPrefs, 2, NOW);
    assert.equal(formProblem(e, deriveForm(e, empty, null), false), 'noCategories');
    assert.equal(e.sourceKind, 'none');
  });
});
