/**
 * What an entry does to your accounts, cards, loans and programs.
 *
 * Saving an entry applies its effects; deleting it applies them in reverse; editing it does
 * both in one batch. Keeping this pure (no storage here) means it can be unit tested.
 */
import { addMonths, isSameDay } from '../lib/dates';
import type { Account, DueChange, Entry, EntryDraft, Liability, Program } from './types';

export type Coll = 'accounts' | 'liabilities' | 'programs';

export type Increment = { coll: Coll; id: string; field: 'balance' | 'paymentsMade'; delta: number };

export type FieldSet =
  | { coll: 'accounts'; id: string; field: 'lastCountedAt'; value: Date | null }
  | { coll: 'liabilities'; id: string; field: 'dueDate'; value: Date | null };

export type Effects = { increments: Increment[]; sets: FieldSet[] };

/** The bits of current state the effects depend on. */
export type EffectState = {
  accounts: Pick<Account, 'id' | 'lastCountedAt'>[];
  liabilities: Pick<Liability, 'id' | 'dueDate'>[];
  programs: Pick<Program, 'id'>[];
};

export function incrementsFor(e: EntryDraft, sign: 1 | -1): Increment[] {
  const out: Increment[] = [];
  switch (e.type) {
    case 'expense':
      if (e.sourceKind === 'account' && e.sourceId) {
        out.push({ coll: 'accounts', id: e.sourceId, field: 'balance', delta: -e.amount * sign });
      } else if (e.sourceKind === 'liability' && e.sourceId) {
        out.push({ coll: 'liabilities', id: e.sourceId, field: 'balance', delta: e.amount * sign });
      }
      break;
    case 'balance':
      out.push({ coll: 'accounts', id: e.accountId, field: 'balance', delta: (e.amount - e.prevBalance) * sign });
      break;
    case 'miles':
      out.push({ coll: 'programs', id: e.programId, field: 'balance', delta: e.delta * sign });
      if (e.mode === 'transfer' && e.fromProgramId) {
        out.push({ coll: 'programs', id: e.fromProgramId, field: 'balance', delta: -e.fromAmount * sign });
      }
      break;
    case 'liability':
      if (e.mode === 'payment') {
        out.push({ coll: 'liabilities', id: e.liabilityId, field: 'balance', delta: -e.amount * sign });
        if (e.fromAccountId) {
          out.push({ coll: 'accounts', id: e.fromAccountId, field: 'balance', delta: -e.amount * sign });
        }
        if (e.countsAsInstalment) {
          out.push({ coll: 'liabilities', id: e.liabilityId, field: 'paymentsMade', delta: sign });
        }
      } else {
        out.push({ coll: 'liabilities', id: e.liabilityId, field: 'balance', delta: e.amount * sign });
      }
      break;
  }
  return out;
}

/** Combine increments that hit the same field and drop the ones that cancel out. */
export function mergeIncrements(list: Increment[]): Increment[] {
  const map = new Map<string, Increment>();
  for (const inc of list) {
    const key = `${inc.coll}/${inc.id}/${inc.field}`;
    const prev = map.get(key);
    if (prev) prev.delta += inc.delta;
    else map.set(key, { ...inc });
  }
  return [...map.values()].filter((i) => i.delta !== 0);
}

function sameMoment(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return a === b;
  return isSameDay(a, b);
}

/** Field changes when an entry is saved. */
export function applySets(e: EntryDraft, state: EffectState): FieldSet[] {
  if (e.type === 'balance') {
    const acc = state.accounts.find((a) => a.id === e.accountId);
    if (acc && (!acc.lastCountedAt || e.date.getTime() >= acc.lastCountedAt.getTime())) {
      return [{ coll: 'accounts', id: acc.id, field: 'lastCountedAt', value: e.date }];
    }
  }
  if (e.type === 'liability' && e.dueChange) {
    const liab = state.liabilities.find((l) => l.id === e.liabilityId);
    if (liab) return [{ coll: 'liabilities', id: liab.id, field: 'dueDate', value: e.dueChange.next }];
  }
  return [];
}

/** Field changes when an entry is removed: put things back if nothing else has moved them since. */
export function reverseSets(e: Entry, state: EffectState): FieldSet[] {
  if (e.type === 'balance') {
    const acc = state.accounts.find((a) => a.id === e.accountId);
    if (acc && acc.lastCountedAt && acc.lastCountedAt.getTime() === e.date.getTime()) {
      return [{ coll: 'accounts', id: acc.id, field: 'lastCountedAt', value: e.prevCountedAt }];
    }
  }
  if (e.type === 'liability' && e.dueChange) {
    const liab = state.liabilities.find((l) => l.id === e.liabilityId);
    if (liab && sameMoment(liab.dueDate, e.dueChange.next)) {
      return [{ coll: 'liabilities', id: liab.id, field: 'dueDate', value: e.dueChange.prev }];
    }
  }
  return [];
}

function withSets(state: EffectState, sets: FieldSet[]): EffectState {
  if (sets.length === 0) return state;
  return {
    programs: state.programs,
    accounts: state.accounts.map((a) => {
      const s = sets.find((x) => x.coll === 'accounts' && x.id === a.id);
      return s ? { ...a, lastCountedAt: s.value } : a;
    }),
    liabilities: state.liabilities.map((l) => {
      const s = sets.find((x) => x.coll === 'liabilities' && x.id === l.id);
      return s ? { ...l, dueDate: s.value } : l;
    }),
  };
}

function exists(state: EffectState, coll: Coll, id: string): boolean {
  const list = coll === 'accounts' ? state.accounts : coll === 'liabilities' ? state.liabilities : state.programs;
  return list.some((x) => x.id === id);
}

/**
 * Everything to write when an entry goes from `before` to `after`.
 * New entry: before = null. Deleting: after = null. Editing: both.
 * Effects on accounts, cards or programs that no longer exist are skipped.
 */
export function planChange(state: EffectState, before: Entry | null, after: EntryDraft | null): Effects {
  const increments: Increment[] = [];
  const sets: FieldSet[] = [];
  let s = state;
  if (before) {
    increments.push(...incrementsFor(before, -1));
    const rs = reverseSets(before, s);
    sets.push(...rs);
    s = withSets(s, rs);
  }
  if (after) {
    increments.push(...incrementsFor(after, 1));
    sets.push(...applySets(after, s));
  }
  const lastSet = new Map<string, FieldSet>();
  for (const set of sets) lastSet.set(`${set.coll}/${set.id}/${set.field}`, set);
  return {
    increments: mergeIncrements(increments).filter((i) => exists(state, i.coll, i.id)),
    sets: [...lastSet.values()].filter((x) => exists(state, x.coll, x.id)),
  };
}

/** Work out how a payment moves a liability's due date. */
export function dueChangeFor(liab: Pick<Liability, 'dueDate' | 'repeatsMonthly'>, roll: boolean): DueChange | null {
  if (!roll || !liab.dueDate) return null;
  return { prev: liab.dueDate, next: liab.repeatsMonthly ? addMonths(liab.dueDate, 1) : null };
}

/** All the ids an entry points at, so one query can find an account's or card's history. */
export function refsOf(e: EntryDraft): string[] {
  const ids: (string | null | undefined)[] = [];
  switch (e.type) {
    case 'expense':
      ids.push(e.categoryId, e.sourceId);
      break;
    case 'balance':
      ids.push(e.accountId);
      break;
    case 'miles':
      ids.push(e.programId, e.fromProgramId);
      break;
    case 'liability':
      ids.push(e.liabilityId, e.fromAccountId);
      break;
  }
  return [...new Set(ids.filter((x): x is string => typeof x === 'string' && x.length > 0))];
}
