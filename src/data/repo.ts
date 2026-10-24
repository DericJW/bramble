/**
 * Everything that changes your farm. Each change is applied in one go, so an entry and the
 * balances it moves always stay in step, and it is then saved on this device (see store.ts).
 *
 * Every function returns a promise that settles once the change is saved; callers catch it
 * to report a failure (for example a full phone).
 */
import { monthKey } from '../lib/dates';
import { byOrder, sortEntries, worthOf } from './calc';
import { DEFAULT_CATEGORIES, sampleFarm } from './defaults';
import { emptyFarm, makeEntry, newId, nextOrder, withAccountAdded, withEntryDeleted, withEntrySaved, type Farm } from './farm';
import { updateFarm } from './store';
import type { Account, Category, Entry, EntryDraft, Liability, MilesGoal, Program, Settings, Snapshot } from './types';

export { newId };

/** Save a new entry (existing = null) or an edited one, moving balances to match. */
export function saveEntry(draft: EntryDraft, existing: Entry | null): Promise<void> {
  return updateFarm((farm) => withEntrySaved(farm, draft, existing));
}

/** Delete an entry and undo what it did to balances. */
export function deleteEntry(entry: Entry): Promise<void> {
  return updateFarm((farm) => withEntryDeleted(farm, entry));
}

/* ------------------------------------------------------------------ */
/* Accounts, programs, liabilities, pouches                            */
/* ------------------------------------------------------------------ */

export type AccountInput = Pick<Account, 'name' | 'kind' | 'icon'>;

/** New account; its opening balance is recorded as its first count. */
export function createAccount(input: AccountInput, opening: number): Promise<void> {
  return updateFarm((farm) => withAccountAdded(farm, input, opening));
}

function patchItem<T extends { id: string }>(list: T[], id: string, patch: Partial<NoInfer<T>>): T[] {
  return list.map((x) => (x.id === id ? { ...x, ...patch } : x));
}

export function updateAccount(id: string, input: Partial<AccountInput>): Promise<void> {
  return updateFarm((farm) => ({ ...farm, accounts: patchItem(farm.accounts, id, input) }));
}

export type ProgramInput = Pick<Program, 'name' | 'kind' | 'icon' | 'rate' | 'expiringAmount' | 'expiringOn'>;

export function createProgram(input: ProgramInput, opening: number): Promise<void> {
  return updateFarm((farm) => {
    const program: Program = { id: newId(), ...input, balance: opening, updatedAt: new Date(), order: nextOrder(farm.programs) };
    return { ...farm, programs: [...farm.programs, program] };
  });
}

export function updateProgram(id: string, input: Partial<ProgramInput>): Promise<void> {
  return updateFarm((farm) => ({ ...farm, programs: patchItem(farm.programs, id, input) }));
}

export type LiabilityInput = Pick<
  Liability,
  'name' | 'kind' | 'icon' | 'dueDate' | 'repeatsMonthly' | 'dueAmount' | 'termPayments' | 'paymentsMade' | 'payFromAccountId' | 'note'
>;

export function createLiability(input: LiabilityInput, opening: number): Promise<void> {
  return updateFarm((farm) => {
    const liability: Liability = { id: newId(), ...input, balance: opening, order: nextOrder(farm.liabilities) };
    return { ...farm, liabilities: [...farm.liabilities, liability] };
  });
}

export function updateLiability(id: string, input: Partial<LiabilityInput>): Promise<void> {
  return updateFarm((farm) => ({ ...farm, liabilities: patchItem(farm.liabilities, id, input) }));
}

/** Correct a balance directly (programs and liabilities have no "count" entry type). */
export function setBalance(coll: 'programs' | 'liabilities', id: string, balance: number): Promise<void> {
  return updateFarm((farm) =>
    coll === 'programs'
      ? { ...farm, programs: patchItem(farm.programs, id, { balance, updatedAt: new Date() }) }
      : { ...farm, liabilities: patchItem(farm.liabilities, id, { balance }) },
  );
}

/** Remove an account, program, liability or pouch. Its old entries stay in your history. */
export function removeItem(coll: 'accounts' | 'programs' | 'liabilities' | 'categories', id: string): Promise<void> {
  return updateFarm((farm) => ({ ...farm, [coll]: (farm[coll] as { id: string }[]).filter((x) => x.id !== id) }));
}

export type CategoryInput = Omit<Category, 'id'> & { id?: string };

/** Save the whole list of pouches from the budgets screen, removing the ones taken out. */
export function saveCategories(list: CategoryInput[], removedIds: string[]): Promise<void> {
  return updateFarm((farm) => {
    const categories: Category[] = list
      .filter((c) => !c.id || !removedIds.includes(c.id))
      .map((c, i) => ({ id: c.id ?? newId(), name: c.name.trim() || 'Pouch', icon: c.icon, budget: Math.max(0, Math.round(c.budget)), order: i }));
    return { ...farm, categories: categories.sort(byOrder) };
  });
}

/* ------------------------------------------------------------------ */
/* Settings and setup                                                  */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS: Settings = { currency: 'SGD', countEveryDays: 14, goal: null };

export function saveSettings(patch: Partial<Settings>): Promise<void> {
  return updateFarm((farm) => ({ ...farm, settings: { ...(farm.settings ?? DEFAULT_SETTINGS), ...patch } }));
}

export function saveGoal(goal: MilesGoal | null): Promise<void> {
  return saveSettings({ goal });
}

/** A brand new farm: settings plus the default pouches. */
export function setupFresh(currency: string): Promise<void> {
  return updateFarm(() => ({
    ...emptyFarm(),
    settings: { ...DEFAULT_SETTINGS, currency },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
  }));
}

/** The sample farm from the design, for looking around. */
export function setupSample(): Promise<void> {
  const now = new Date();
  const sample = sampleFarm(now);
  const worth = worthOf(sample.accounts, sample.liabilities);
  const snapshot: Snapshot = {
    month: monthKey(now),
    assets: worth.assets,
    liabilities: worth.owed,
    net: sample.monthStartNet,
    takenAt: new Date(now.getFullYear(), now.getMonth(), 1, 9),
  };
  return updateFarm(() => ({
    settings: sample.settings,
    accounts: sample.accounts,
    programs: sample.programs,
    liabilities: sample.liabilities,
    categories: sample.categories,
    entries: sortEntries(sample.entries.map(({ id, ...e }) => makeEntry(id, e as EntryDraft, e.date))),
    snapshots: [snapshot],
  }));
}

/** Remember net worth at the start of the month, for "since 1 Oct". */
export function takeSnapshot(key: string, worth: { assets: number; owed: number; net: number }): Promise<void> {
  return updateFarm((farm) => {
    if (farm.snapshots.some((s) => s.month === key)) return farm;
    const snap: Snapshot = { month: key, assets: worth.assets, liabilities: worth.owed, net: worth.net, takenAt: new Date() };
    return { ...farm, snapshots: [...farm.snapshots, snap] };
  });
}

/** Delete everything on this device and go back to the welcome screen. */
export function clearEverything(): Promise<void> {
  return updateFarm(() => emptyFarm());
}

/** Replace everything on this device with a farm from a backup. */
export function restoreFarm(farm: Farm): Promise<void> {
  return updateFarm(() => farm);
}
