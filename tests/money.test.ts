import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  centsToDigits,
  centsToInput,
  digitsToCents,
  digitsToCount,
  displayDigits,
  formatCount,
  formatMoney,
  groupDigits,
  MINUS,
  parseCountInput,
  parseMoneyInput,
  percent,
  pressKey,
} from '../src/lib/money';

describe('formatting', () => {
  test('groups thousands', () => {
    assert.equal(groupDigits('0'), '0');
    assert.equal(groupDigits('123'), '123');
    assert.equal(groupDigits('1234'), '1,234');
    assert.equal(groupDigits('1234567'), '1,234,567');
    assert.equal(groupDigits('007'), '7');
  });

  test('formats money like the design', () => {
    assert.equal(formatMoney(3501840, 'SGD'), 'S$35,018.40');
    assert.equal(formatMoney(-480, 'SGD'), `${MINUS}S$4.80`);
    assert.equal(formatMoney(124010, 'SGD', { sign: 'always' }), '+S$1,240.10');
    assert.equal(formatMoney(250000, 'SGD', { trimZero: true }), 'S$2,500');
    assert.equal(formatMoney(250050, 'SGD', { trimZero: true }), 'S$2,500.50');
    assert.equal(formatMoney(0, 'SGD'), 'S$0.00');
  });

  test('hides amounts in privacy mode', () => {
    assert.equal(formatMoney(3501840, 'SGD', { hidden: true }), 'S$ ••••••');
    assert.equal(formatMoney(3501840, 'SGD', { hidden: true, dots: 2 }), 'S$ ••');
  });

  test('currencies without cents round', () => {
    assert.equal(formatMoney(123456, 'JPY'), '¥1,235');
    assert.equal(formatMoney(5, 'KRW'), '₩0');
  });

  test('unknown currency falls back to SGD', () => {
    assert.equal(formatMoney(100, 'XYZ'), 'S$1.00');
  });

  test('counts', () => {
    assert.equal(formatCount(127630), '127,630');
    assert.equal(formatCount(-25000, { sign: 'always' }), `${MINUS}25,000`);
    assert.equal(formatCount(1240, { sign: 'always' }), '+1,240');
  });

  test('percent', () => {
    assert.equal(percent(148630, 250000), 59);
    assert.equal(percent(1, 0), 0);
  });
});

describe('parsing typed amounts', () => {
  test('money input', () => {
    assert.equal(parseMoneyInput('1,234.5'), 123450);
    assert.equal(parseMoneyInput('S$ 20'), 2000);
    assert.equal(parseMoneyInput('-3.10'), -310);
    assert.equal(parseMoneyInput('1.2.3'), 123);
    assert.equal(parseMoneyInput(''), null);
    assert.equal(parseMoneyInput('abc'), null);
    assert.equal(parseMoneyInput('0.1'), 10);
    assert.equal(parseMoneyInput('19.99'), 1999);
  });

  test('count input', () => {
    assert.equal(parseCountInput('12,000'), 12000);
    assert.equal(parseCountInput(''), null);
  });

  test('cents to an editable field', () => {
    assert.equal(centsToInput(245000), '2450');
    assert.equal(centsToInput(245050), '2450.50');
    assert.equal(centsToInput(-505), '-5.05');
  });
});

describe('keypad', () => {
  const type = (keys: string[], allowDecimal = true) => keys.reduce((d, k) => pressKey(d, k, { allowDecimal }), '');

  test('builds amounts', () => {
    assert.equal(type(['2', '4', '.', '5']), '24.5');
    assert.equal(type(['0', '7']), '7');
    assert.equal(type(['.', '5']), '0.5');
  });

  test('refuses a third decimal and a second point', () => {
    assert.equal(type(['1', '.', '2', '3', '4']), '1.23');
    assert.equal(type(['1', '.', '.', '2']), '1.2');
  });

  test('no decimals for miles', () => {
    assert.equal(type(['1', '.', '2'], false), '12');
  });

  test('caps the length', () => {
    assert.equal(type(['1', '2', '3', '4', '5', '6', '7', '8', '9', '9', '9']), '123456789');
  });

  test('backspace and clear', () => {
    assert.equal(pressKey('245', 'back', { allowDecimal: true }), '24');
    assert.equal(pressKey('245', 'clear', { allowDecimal: true }), '');
  });

  test('round trips', () => {
    assert.equal(digitsToCents('24.5'), 2450);
    assert.equal(digitsToCents(''), 0);
    assert.equal(digitsToCount('1240'), 1240);
    assert.equal(centsToDigits(2450), '24.5');
    assert.equal(centsToDigits(2405), '24.05');
    assert.equal(centsToDigits(2400), '24');
    assert.equal(centsToDigits(0), '');
    assert.equal(displayDigits('24850.5'), '24,850.5');
    assert.equal(displayDigits(''), '0');
    for (const cents of [1, 10, 99, 100, 2450, 2405, 123456789]) {
      assert.equal(digitsToCents(centsToDigits(cents)), cents);
    }
  });
});
