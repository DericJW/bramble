/**
 * Everything that writes to Firestore. Each change is one batch, so an entry and the
 * balances it moves are saved together or not at all.
 *
 * Writes are sent without waiting for the server: Firestore shows them on screen straight
 * away and syncs in the background. Callers catch the returned promise to report failures.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentReference,
  type WriteBatch,
} from 'firebase/firestore';

import { getDb } from '../lib/firebase';
import { atNoon, monthKey } from '../lib/dates';
import { worthOf } from './calc';
import { entryFields, toEntry } from './convert';
import { DEFAULT_CATEGORIES, sampleFarm } from './defaults';
import { planChange, refsOf, type EffectState } from './effects';
import type { Account, Category, Entry, EntryDraft, Liability, MilesGoal, Program, Settings } from './types';

type Raw = Record<string, unknown>;

const userDoc = (uid: string) => doc(getDb(), 'users', uid);
const sub = (uid: string, name: string) => collection(getDb(), 'users', uid, name);
const subDoc = (uid: string, name: string, id: string) => doc(getDb(), 'users', uid, name, id);

/** Add the balance changes from an entry change to a batch. */
function addEffects(batch: WriteBatch, uid: string, state: EffectState, before: Entry | null, after: EntryDraft | null) {
  const plan = planChange(state, before, after);
  const updates = new Map<string, { ref: DocumentReference; data: Raw }>();
  const touch = (coll: string, id: string) => {
    const key = `${coll}/${id}`;
    let u = updates.get(key);
    if (!u) {
      u = { ref: subDoc(uid, coll, id), data: { updatedAt: serverTimestamp() } };
      updates.set(key, u);
    }
    return u.data;
  };
  for (const inc of plan.increments) touch(inc.coll, inc.id)[inc.field] = increment(inc.delta);
  for (const set of plan.sets) touch(set.coll, set.id)[set.field] = set.value;
  updates.forEach(({ ref, data }) => batch.update(ref, data));
}

/** Save a new entry (existing = null) or an edited one, moving balances to match. */
export function saveEntry(uid: string, state: EffectState, draft: EntryDraft, existing: Entry | null): Promise<void> {
  const batch = writeBatch(getDb());
  const ref = existing ? subDoc(uid, 'entries', existing.id) : doc(sub(uid, 'entries'));
  batch.set(ref, {
    ...entryFields(draft),
    refs: refsOf(draft),
    createdAt: existing?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  addEffects(batch, uid, state, existing, draft);
  return batch.commit();
}

/** Delete an entry and undo what it did to balances. */
export function deleteEntry(uid: string, state: EffectState, entry: Entry): Promise<void> {
  const batch = writeBatch(getDb());
  batch.delete(subDoc(uid, 'entries', entry.id));
  addEffects(batch, uid, state, entry, null);
  return batch.commit();
}

/* ------------------------------------------------------------------ */
/* Accounts, programs, liabilities, pouches                            */
/* ------------------------------------------------------------------ */

function nextOrder(list: { order: number }[]): number {
  return list.reduce((m, x) => Math.max(m, x.order + 1), 0);
}

export type AccountInput = Pick<Account, 'name' | 'kind' | 'icon'>;

/** New account; its opening balance is recorded as its first count. */
export function createAccount(uid: string, input: AccountInput, opening: number, existing: Account[]): Promise<void> {
  const batch = writeBatch(getDb());
  const ref = doc(sub(uid, 'accounts'));
  const today = atNoon(new Date());
  batch.set(ref, {
    ...input,
    balance: opening,
    lastCountedAt: today,
    order: nextOrder(existing),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const entryRef = doc(sub(uid, 'entries'));
  batch.set(entryRef, {
    type: 'balance',
    date: today,
    note: 'Opening balance',
    accountId: ref.id,
    amount: opening,
    prevBalance: 0,
    prevCountedAt: null,
    refs: [ref.id],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return batch.commit();
}

export function updateAccount(uid: string, id: string, input: Partial<AccountInput>): Promise<void> {
  return setDoc(subDoc(uid, 'accounts', id), { ...input, updatedAt: serverTimestamp() }, { merge: true });
}

export type ProgramInput = Pick<Program, 'name' | 'kind' | 'icon' | 'rate' | 'expiringAmount' | 'expiringOn'>;

export function createProgram(uid: string, input: ProgramInput, opening: number, existing: Program[]): Promise<void> {
  return setDoc(doc(sub(uid, 'programs')), {
    ...input,
    balance: opening,
    order: nextOrder(existing),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateProgram(uid: string, id: string, input: Partial<ProgramInput>): Promise<void> {
  return setDoc(subDoc(uid, 'programs', id), { ...input, updatedAt: serverTimestamp() }, { merge: true });
}

export type LiabilityInput = Pick<
  Liability,
  'name' | 'kind' | 'icon' | 'dueDate' | 'repeatsMonthly' | 'dueAmount' | 'termPayments' | 'paymentsMade' | 'payFromAccountId' | 'note'
>;

export function createLiability(uid: string, input: LiabilityInput, opening: number, existing: Liability[]): Promise<void> {
  return setDoc(doc(sub(uid, 'liabilities')), {
    ...input,
    balance: opening,
    order: nextOrder(existing),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateLiability(uid: string, id: string, input: Partial<LiabilityInput>): Promise<void> {
  return setDoc(subDoc(uid, 'liabilities', id), { ...input, updatedAt: serverTimestamp() }, { merge: true });
}

/** Correct a balance directly (programs and liabilities have no "count" entry type). */
export function setBalance(uid: string, coll: 'programs' | 'liabilities', id: string, balance: number): Promise<void> {
  return setDoc(subDoc(uid, coll, id), { balance, updatedAt: serverTimestamp() }, { merge: true });
}

export function removeItem(uid: string, coll: 'accounts' | 'programs' | 'liabilities' | 'categories', id: string): Promise<void> {
  return deleteDoc(subDoc(uid, coll, id));
}

export type CategoryInput = Omit<Category, 'id'> & { id?: string };

/** Save the whole list of pouches from the budgets screen, removing the ones taken out. */
export function saveCategories(uid: string, list: CategoryInput[], removedIds: string[]): Promise<void> {
  const batch = writeBatch(getDb());
  list.forEach((c, i) => {
    const ref = c.id ? subDoc(uid, 'categories', c.id) : doc(sub(uid, 'categories'));
    batch.set(ref, { name: c.name.trim() || 'Pouch', icon: c.icon, budget: Math.max(0, Math.round(c.budget)), order: i, updatedAt: serverTimestamp() }, { merge: true });
  });
  removedIds.forEach((id) => batch.delete(subDoc(uid, 'categories', id)));
  return batch.commit();
}

/* ------------------------------------------------------------------ */
/* Settings and setup                                                  */
/* ------------------------------------------------------------------ */

export function saveSettings(uid: string, patch: Partial<Settings>): Promise<void> {
  return setDoc(userDoc(uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

export function saveGoal(uid: string, goal: MilesGoal | null): Promise<void> {
  return setDoc(userDoc(uid), { goal, updatedAt: serverTimestamp() }, { merge: true });
}

/** A brand new farm: settings plus the default pouches. */
export function setupFresh(uid: string, currency: string): Promise<void> {
  const batch = writeBatch(getDb());
  batch.set(userDoc(uid), { currency, countEveryDays: 14, goal: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  for (const c of DEFAULT_CATEGORIES) {
    batch.set(subDoc(uid, 'categories', c.id), { name: c.name, icon: c.icon, budget: c.budget, order: c.order });
  }
  return batch.commit();
}

/** The sample farm from the design, for looking around. */
export function setupSample(uid: string): Promise<void> {
  const now = new Date();
  const farm = sampleFarm(now);
  const batch = writeBatch(getDb());
  batch.set(userDoc(uid), { ...farm.settings, sample: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  for (const { id, ...a } of farm.accounts) batch.set(subDoc(uid, 'accounts', id), { ...a, updatedAt: serverTimestamp() });
  for (const { id, ...p } of farm.programs) batch.set(subDoc(uid, 'programs', id), { ...p, updatedAt: p.updatedAt ?? serverTimestamp() });
  for (const { id, ...l } of farm.liabilities) batch.set(subDoc(uid, 'liabilities', id), { ...l, updatedAt: serverTimestamp() });
  for (const { id, ...c } of farm.categories) batch.set(subDoc(uid, 'categories', id), c);
  for (const { id, ...e } of farm.entries) {
    batch.set(subDoc(uid, 'entries', id), { ...entryFields(e), refs: refsOf(e), createdAt: e.date, updatedAt: serverTimestamp() });
  }
  const worth = worthOf(farm.accounts, farm.liabilities);
  batch.set(subDoc(uid, 'snapshots', monthKey(now)), {
    assets: worth.assets,
    liabilities: worth.owed,
    net: farm.monthStartNet,
    takenAt: new Date(now.getFullYear(), now.getMonth(), 1, 9),
  });
  return batch.commit();
}

/** Remember net worth at the start of the month, for "since 1 Oct". */
export function takeSnapshot(uid: string, key: string, worth: { assets: number; owed: number; net: number }): Promise<void> {
  return setDoc(subDoc(uid, 'snapshots', key), {
    assets: worth.assets,
    liabilities: worth.owed,
    net: worth.net,
    takenAt: serverTimestamp(),
  });
}

/** Delete everything the user has stored, in chunks Firestore is happy with. */
export async function clearEverything(uid: string): Promise<void> {
  const db = getDb();
  for (const name of ['entries', 'accounts', 'programs', 'liabilities', 'categories', 'snapshots']) {
    for (;;) {
      const snap = await getDocs(query(sub(uid, name), limit(400)));
      if (snap.empty) break;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      if (snap.size < 400) break;
    }
  }
  await deleteDoc(userDoc(uid));
}

/** All expenses ever, for search (one read, not kept live). */
export async function fetchAllExpenses(uid: string): Promise<Entry[]> {
  const snap = await getDocs(query(sub(uid, 'entries'), where('type', '==', 'expense')));
  const out: Entry[] = [];
  snap.docs.forEach((d) => {
    const e = toEntry(d.id, d.data({ serverTimestamps: 'estimate' }));
    if (e) out.push(e);
  });
  return out;
}
