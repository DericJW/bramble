import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { sortEntries } from '../src/data/calc';
import { sampleFarm } from '../src/data/defaults';
import {
  backupText,
  emptyFarm,
  makeEntry,
  parseFarm,
  readBackup,
  serializeFarm,
  withAccountAdded,
  withEntryDeleted,
  withEntrySaved,
  type Farm,
} from '../src/data/farm';
import type { EntryDraft, ExpenseEntry, LiabilityEntry } from '../src/data/types';

const NOW = new Date(2026, 9, 16, 13, 20);

function sample(): Farm {
  const s = sampleFarm(NOW);
  return {
    settings: s.settings,
    accounts: s.accounts,
    programs: s.programs,
    liabilities: s.liabilities,
    categories: s.categories,
    entries: sortEntries(s.entries.map(({ id, ...e }) => makeEntry(id, e as EntryDraft, e.date))),
    snapshots: [{ month: '2026-10', assets: 1, liabilities: 2, net: -1, takenAt: new Date(2026, 9, 1, 9) }],
  };
}

const bal = (f: Farm, id: string) => f.accounts.find((a) => a.id === id)?.balance;
const owed = (f: Farm, id: string) => f.liabilities.find((l) => l.id === id)?.balance;

describe('entries on the farm', () => {
  test('an expense from an account lowers it; editing and deleting put it right', () => {
    const f0 = sample();
    const before = bal(f0, 'sample-daily')!;
    const draft: EntryDraft = { type: 'expense', date: NOW, note: ' Lunch ', amount: 1250, categoryId: 'food', sourceKind: 'account', sourceId: 'sample-daily' };
    const f1 = withEntrySaved(f0, draft, null, 'e1');
    assert.equal(bal(f1, 'sample-daily'), before - 1250);
    const saved = f1.entries.find((e) => e.id === 'e1') as ExpenseEntry;
    assert.equal(saved.note, 'Lunch');
    assert.equal(f1.entries.length, f0.entries.length + 1);

    const f2 = withEntrySaved(f1, { ...draft, amount: 2000 }, saved);
    assert.equal(bal(f2, 'sample-daily'), before - 2000);
    assert.equal(f2.entries.length, f1.entries.length);

    const f3 = withEntryDeleted(f2, saved);
    assert.equal(bal(f3, 'sample-daily'), before);
    assert.equal(f3.entries.length, f0.entries.length);
    // The original farm is untouched.
    assert.equal(bal(f0, 'sample-daily'), before);
  });

  test('a card payment from an account moves both balances and the due date, and undoes cleanly', () => {
    const f0 = sample();
    const visa = f0.liabilities.find((l) => l.id === 'sample-visa')!;
    const main = bal(f0, 'sample-main')!;
    const next = new Date(visa.dueDate!.getFullYear(), visa.dueDate!.getMonth() + 1, visa.dueDate!.getDate(), 12);
    const draft: EntryDraft = {
      type: 'liability',
      date: NOW,
      note: '',
      mode: 'payment',
      liabilityId: 'sample-visa',
      amount: visa.balance,
      fromAccountId: 'sample-main',
      dueChange: { prev: visa.dueDate, next },
      countsAsInstalment: false,
    };
    const f1 = withEntrySaved(f0, draft, null, 'pay1');
    assert.equal(owed(f1, 'sample-visa'), 0);
    assert.equal(bal(f1, 'sample-main'), main - visa.balance);
    assert.equal(f1.liabilities.find((l) => l.id === 'sample-visa')!.dueDate?.getTime(), next.getTime());

    const f2 = withEntryDeleted(f1, f1.entries.find((e) => e.id === 'pay1') as LiabilityEntry);
    assert.equal(owed(f2, 'sample-visa'), visa.balance);
    assert.equal(bal(f2, 'sample-main'), main);
    assert.equal(f2.liabilities.find((l) => l.id === 'sample-visa')!.dueDate?.getTime(), visa.dueDate!.getTime());
  });

  test('editing an entry that was deleted meanwhile saves it as a new one', () => {
    const f0 = sample();
    const draft: EntryDraft = { type: 'expense', date: NOW, note: '', amount: 500, categoryId: 'food', sourceKind: 'none', sourceId: null };
    const f1 = withEntrySaved(f0, draft, null, 'gone');
    const gone = f1.entries.find((e) => e.id === 'gone')!;
    const f2 = withEntryDeleted(f1, gone);
    const f3 = withEntrySaved(f2, draft, gone, 'fresh');
    assert.ok(f3.entries.some((e) => e.id === 'fresh'));
    assert.equal(f3.entries.length, f0.entries.length + 1);
  });

  test('a new account starts with an opening balance count', () => {
    const f = withAccountAdded(emptyFarm(), { name: 'Pocket', kind: 'cash', icon: 'pouch' }, 4200, NOW);
    assert.equal(f.accounts.length, 1);
    assert.equal(f.accounts[0].balance, 4200);
    assert.equal(f.entries.length, 1);
    assert.equal(f.entries[0].type, 'balance');
    assert.equal(f.entries[0].note, 'Opening balance');
  });
});

describe('saving and backups', () => {
  test('the farm survives being written and read back', () => {
    const f0 = sample();
    const f1 = parseFarm(JSON.parse(serializeFarm(f0)));
    assert.deepEqual(f1, f0);
    assert.ok(f1.entries[0].date instanceof Date);
  });

  test('an empty or broken store reads as an empty farm', () => {
    assert.deepEqual(parseFarm(null), emptyFarm());
    assert.deepEqual(parseFarm({ accounts: [{ name: 'no id' }], entries: 'nope' }), emptyFarm());
  });

  test('a backup restores the same farm', () => {
    const f0 = sample();
    const { farm, exportedAt } = readBackup(backupText(f0));
    assert.deepEqual(farm, f0);
    assert.ok(exportedAt instanceof Date);
  });

  test('other files are turned away with a clear message', () => {
    assert.throws(() => readBackup('hello'), /isn’t a Bramble backup/);
    assert.throws(() => readBackup('{"app":"other","farm":{}}'), /isn’t a Bramble backup/);
    assert.throws(() => readBackup('{"app":"bramble","version":99,"farm":{"settings":{}}}'), /newer version/);
    assert.throws(() => readBackup('{"app":"bramble","version":1,"farm":{}}'), /no farm/);
  });
});
