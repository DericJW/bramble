/**
 * The farm as plain data, with no storage or React involved (so it can be unit tested):
 * reading and writing it as JSON, backups, and the changes an entry makes.
 */
import { atNoon } from '../lib/dates';
import { byOrder, sortEntries } from './calc';
import { entryFields, toAccount, toCategory, toDate, toEntry, toLiability, toProgram, toSettings, toSnapshot } from './convert';
import { planChange, type Effects } from './effects';
import type { Account, Category, Entry, EntryDraft, Liability, Program, Settings, Snapshot } from './types';

export type Farm = {
  /** Null until the farm has been set up on the welcome screen. */
  settings: Settings | null;
  accounts: Account[];
  programs: Program[];
  liabilities: Liability[];
  categories: Category[];
  /** Every entry, newest first. */
  entries: Entry[];
  /** Net worth on the 1st of each month. */
  snapshots: Snapshot[];
};

export const BACKUP_APP = 'bramble';
export const BACKUP_VERSION = 1;

export function emptyFarm(): Farm {
  return { settings: null, accounts: [], programs: [], liabilities: [], categories: [], entries: [], snapshots: [] };
}

type Raw = Record<string, unknown>;

function list<T>(v: unknown, read: (id: string, r: Raw) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Raw;
    const id = typeof r.id === 'string' && r.id ? r.id : null;
    if (!id) continue;
    const x = read(id, r);
    if (x) out.push(x);
  }
  return out;
}

/** Rebuilds a farm from stored or imported JSON, with safe defaults for anything missing. */
export function parseFarm(raw: unknown): Farm {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Raw;
  return {
    settings: r.settings && typeof r.settings === 'object' ? toSettings(r.settings as Raw) : null,
    accounts: list(r.accounts, toAccount).sort(byOrder),
    programs: list(r.programs, toProgram).sort(byOrder),
    liabilities: list(r.liabilities, toLiability).sort(byOrder),
    categories: list(r.categories, toCategory).sort(byOrder),
    entries: sortEntries(list(r.entries, toEntry)),
    snapshots: list(r.snapshots, (id, s) => toSnapshot(typeof s.month === 'string' ? s.month : id, s)),
  };
}

/** The farm as JSON. Snapshots are stored with their month as the id. */
export function serializeFarm(farm: Farm): string {
  return JSON.stringify({ ...farm, snapshots: farm.snapshots.map((s) => ({ ...s, id: s.month })) });
}

/** A backup file's contents. */
export function backupText(farm: Farm): string {
  return JSON.stringify(
    { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), farm: JSON.parse(serializeFarm(farm)) },
    null,
    1,
  );
}

export type ParsedBackup = { farm: Farm; exportedAt: Date | null };

/** Reads a backup file. Throws an error with a friendly message if it isn't one. */
export function readBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t a Bramble backup.');
  }
  const r = (raw && typeof raw === 'object' ? raw : {}) as Raw;
  if (r.app !== BACKUP_APP || !r.farm || typeof r.farm !== 'object') throw new Error('That file isn’t a Bramble backup.');
  if (typeof r.version === 'number' && r.version > BACKUP_VERSION) {
    throw new Error('This backup comes from a newer version of Bramble. Update the app first.');
  }
  const farm = parseFarm(r.farm);
  if (!farm.settings) throw new Error('That backup has no farm in it.');
  return { farm, exportedAt: toDate(r.exportedAt) };
}


/* ------------------------------------------------------------------ */
/* Entries and the balances they move                                  */
/* ------------------------------------------------------------------ */

/** A short random id, unique enough for one person's farm. */
export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Apply the balance changes an entry makes. */
export function applyEffects(farm: Farm, plan: Effects): Farm {
  if (plan.increments.length === 0 && plan.sets.length === 0) return farm;
  const accounts = farm.accounts.map((a) => {
    let next = a;
    for (const inc of plan.increments) if (inc.coll === 'accounts' && inc.id === a.id && inc.field === 'balance') next = { ...next, balance: next.balance + inc.delta };
    for (const s of plan.sets) if (s.coll === 'accounts' && s.id === a.id) next = { ...next, lastCountedAt: s.value };
    return next;
  });
  const liabilities = farm.liabilities.map((l) => {
    let next = l;
    for (const inc of plan.increments) {
      if (inc.coll !== 'liabilities' || inc.id !== l.id) continue;
      if (inc.field === 'balance') next = { ...next, balance: next.balance + inc.delta };
      else next = { ...next, paymentsMade: Math.max(0, (next.paymentsMade ?? 0) + inc.delta) };
    }
    for (const s of plan.sets) if (s.coll === 'liabilities' && s.id === l.id) next = { ...next, dueDate: s.value };
    return next;
  });
  const programs = farm.programs.map((p) => {
    let next = p;
    for (const inc of plan.increments) if (inc.coll === 'programs' && inc.id === p.id && inc.field === 'balance') next = { ...next, balance: next.balance + inc.delta, updatedAt: new Date() };
    return next;
  });
  return { ...farm, accounts, liabilities, programs };
}

export function effectState(farm: Farm) {
  return { accounts: farm.accounts, liabilities: farm.liabilities, programs: farm.programs };
}

export function makeEntry(id: string, draft: EntryDraft, createdAt: Date | null): Entry {
  const e = toEntry(id, { ...entryFields(draft), createdAt: createdAt ?? new Date() });
  if (!e) throw new Error('That entry is missing its date.');
  return e;
}

/** The farm with an entry added (existing = null) or edited, balances moved to match. */
export function withEntrySaved(farm: Farm, draft: EntryDraft, existing: Entry | null, id: string = newId()): Farm {
  // Edit what is stored now; an entry deleted in the meantime is saved as a new one.
  const current = existing ? (farm.entries.find((e) => e.id === existing.id) ?? null) : null;
  const plan = planChange(effectState(farm), current, draft);
  const entry = makeEntry(current?.id ?? id, draft, current?.createdAt ?? null);
  const others = farm.entries.filter((e) => e.id !== entry.id);
  return { ...applyEffects(farm, plan), entries: sortEntries([entry, ...others]) };
}

/** The farm with an entry deleted and what it did to balances undone. */
export function withEntryDeleted(farm: Farm, entry: Entry): Farm {
  const current = farm.entries.find((e) => e.id === entry.id);
  if (!current) return farm;
  const plan = planChange(effectState(farm), current, null);
  return { ...applyEffects(farm, plan), entries: farm.entries.filter((e) => e.id !== entry.id) };
}

/** A new account, with its opening balance recorded as its first count. */
export function withAccountAdded(farm: Farm, input: Pick<Account, 'name' | 'kind' | 'icon'>, opening: number, now: Date = new Date()): Farm {
  const today = atNoon(now);
  const account: Account = { id: newId(), ...input, balance: opening, lastCountedAt: today, order: nextOrder(farm.accounts) };
  const entry = makeEntry(
    newId(),
    { type: 'balance', date: today, note: 'Opening balance', accountId: account.id, amount: opening, prevBalance: 0, prevCountedAt: null },
    null,
  );
  return { ...farm, accounts: [...farm.accounts, account], entries: sortEntries([entry, ...farm.entries]) };
}

export function nextOrder(list: { order: number }[]): number {
  return list.reduce((m, x) => Math.max(m, x.order + 1), 0);
}

