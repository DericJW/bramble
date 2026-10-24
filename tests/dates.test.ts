import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  addMonths,
  daysBetween,
  dueText,
  formatHeaderDate,
  formatLongDate,
  greeting,
  isNightTime,
  monthFromKey,
  monthGrid,
  monthKey,
  ordinal,
  relativeDay,
} from '../src/lib/dates';

describe('dates', () => {
  test('adding months keeps the day where it can', () => {
    const jan31 = new Date(2027, 0, 31, 12);
    const feb = addMonths(jan31, 1);
    assert.equal(feb.getMonth(), 1);
    assert.equal(feb.getDate(), 28);
    const oct28 = new Date(2026, 9, 28, 12);
    assert.equal(formatLongDate(addMonths(oct28, 1)), '28 Nov 2026');
    assert.equal(formatLongDate(addMonths(oct28, 3)), '28 Jan 2027');
    assert.equal(formatLongDate(addMonths(oct28, -1)), '28 Sep 2026');
  });

  test('days between calendar days', () => {
    const a = new Date(2026, 9, 16, 23, 30);
    const b = new Date(2026, 9, 28, 1, 0);
    assert.equal(daysBetween(a, b), 12);
    assert.equal(daysBetween(b, a), -12);
    assert.equal(daysBetween(a, new Date(2026, 9, 16, 0, 1)), 0);
  });

  test('month keys round trip', () => {
    const d = new Date(2026, 9, 16);
    assert.equal(monthKey(d), '2026-10');
    assert.equal(monthFromKey('2026-10').getTime(), new Date(2026, 9, 1).getTime());
  });

  test('labels', () => {
    const now = new Date(2026, 9, 16, 9);
    assert.equal(formatHeaderDate(now), 'Fri · 16 October');
    assert.equal(relativeDay(new Date(2026, 9, 16, 12), now), 'Today');
    assert.equal(relativeDay(new Date(2026, 9, 15, 12), now), 'Yesterday');
    assert.equal(relativeDay(new Date(2026, 9, 12, 12), now), 'Mon, 12 Oct');
    assert.equal(dueText(12), 'Due in 12 days');
    assert.equal(dueText(0), 'Due today');
    assert.equal(dueText(-3), 'Overdue by 3 days');
    assert.equal(ordinal(28), '28th');
    assert.equal(ordinal(1), '1st');
    assert.equal(ordinal(22), '22nd');
    assert.equal(ordinal(13), '13th');
  });

  test('greeting and night time', () => {
    assert.equal(greeting(new Date(2026, 9, 16, 9)), 'Good morning');
    assert.equal(greeting(new Date(2026, 9, 16, 14)), 'Good afternoon');
    assert.equal(greeting(new Date(2026, 9, 16, 20)), 'Good evening');
    assert.equal(isNightTime(new Date(2026, 9, 16, 20)), true);
    assert.equal(isNightTime(new Date(2026, 9, 16, 5)), true);
    assert.equal(isNightTime(new Date(2026, 9, 16, 12)), false);
  });

  test('calendar grid starts on Monday', () => {
    const weeks = monthGrid(new Date(2026, 9, 1));
    // 1 Oct 2026 is a Thursday: three empty cells first.
    assert.equal(weeks[0][0], null);
    assert.equal(weeks[0][3]?.getDate(), 1);
    const days = weeks.flat().filter(Boolean).length;
    assert.equal(days, 31);
    weeks.forEach((w) => assert.equal(w.length, 7));
  });
});
