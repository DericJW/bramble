import { atNoon } from '../lib/dates';
import { dueAmountOf } from './calc';
import { dueChangeFor } from './effects';
import type { EntryDraft, Liability } from './types';

/** A payment entry for a liability. Rolling moves a monthly due date on by a month (or clears a one-off). */
export function paymentDraft(
  l: Liability,
  amount: number,
  opts: { fromAccountId: string | null; roll: boolean; date?: Date; note?: string },
): EntryDraft {
  return {
    type: 'liability',
    mode: 'payment',
    liabilityId: l.id,
    amount,
    fromAccountId: opts.fromAccountId,
    dueChange: dueChangeFor(l, opts.roll),
    countsAsInstalment: opts.roll && l.kind === 'loan' && !!l.termPayments,
    date: atNoon(opts.date ?? new Date()),
    note: opts.note ?? '',
  };
}

/** "Mark as paid": pay what is due from the usual account and move the due date on. */
export function markPaidDraft(l: Liability, now: Date = new Date()): EntryDraft {
  return paymentDraft(l, dueAmountOf(l), { fromAccountId: l.payFromAccountId, roll: true, date: now });
}

/** Whether a payment of this size should move the due date on by default. */
export function shouldRoll(l: Liability, amount: number): boolean {
  if (!l.dueDate) return false;
  return amount >= dueAmountOf(l) && amount > 0;
}
