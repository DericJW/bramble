/**
 * Money helpers. Every amount of money in the app is stored as an integer number of
 * hundredths ("cents"), whatever the currency, so totals never pick up floating point
 * dust. Currencies without minor units (yen, won...) simply display rounded.
 */

export type CurrencyInfo = {
  code: string;
  symbol: string;
  name: string;
  decimals: 0 | 2;
};

export const CURRENCIES: readonly CurrencyInfo[] = [
  { code: 'SGD', symbol: 'S$', name: 'Singapore dollar', decimals: 2 },
  { code: 'USD', symbol: 'US$', name: 'US dollar', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British pound', decimals: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian dollar', decimals: 2 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand dollar', decimals: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian dollar', decimals: 2 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian ringgit', decimals: 2 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong dollar', decimals: 2 },
  { code: 'CNY', symbol: 'CN¥', name: 'Chinese yuan', decimals: 2 },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan dollar', decimals: 0 },
  { code: 'JPY', symbol: '¥', name: 'Japanese yen', decimals: 0 },
  { code: 'KRW', symbol: '₩', name: 'South Korean won', decimals: 0 },
  { code: 'INR', symbol: '₹', name: 'Indian rupee', decimals: 2 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian rupiah', decimals: 0 },
  { code: 'THB', symbol: '฿', name: 'Thai baht', decimals: 2 },
  { code: 'PHP', symbol: '₱', name: 'Philippine peso', decimals: 2 },
  { code: 'VND', symbol: '₫', name: 'Vietnamese dong', decimals: 0 },
  { code: 'CHF', symbol: 'CHF ', name: 'Swiss franc', decimals: 2 },
];

export const DEFAULT_CURRENCY = 'SGD';

/** The real minus sign reads better than a hyphen next to numbers. */
export const MINUS = '−';
export const DOTS = '••••';

export function currencyInfo(code: string | undefined | null): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/** "1234567" → "1,234,567". Expects a string of digits only. */
export function groupDigits(digits: string): string {
  const clean = digits.replace(/^0+(?=\d)/, '');
  let out = '';
  for (let i = 0; i < clean.length; i++) {
    const fromEnd = clean.length - i;
    out += clean[i];
    if (fromEnd > 1 && fromEnd % 3 === 1) out += ',';
  }
  return out === '' ? '0' : out;
}

export type MoneyFormat = {
  /** Show dots instead of the amount (privacy mode). */
  hidden?: boolean;
  /** 'auto' shows a minus for negatives, 'always' adds a plus for positives too, 'never' drops the sign. */
  sign?: 'auto' | 'always' | 'never';
  /** Drop the decimals when they are .00 (useful for budgets: "S$2,500"). */
  trimZero?: boolean;
  /** Leave the currency symbol out. */
  bare?: boolean;
  /** Number of dots in hidden mode (default 6). */
  dots?: number;
};

export function formatMoney(cents: number, code: string, opts: MoneyFormat = {}): string {
  const cur = currencyInfo(code);
  const sym = opts.bare ? '' : cur.symbol;
  const value = Number.isFinite(cents) ? Math.round(cents) : 0;
  const negative = value < 0;
  const sign = opts.sign ?? 'auto';
  const signText = sign === 'never' ? '' : negative ? MINUS : sign === 'always' && value > 0 ? '+' : '';

  if (opts.hidden) {
    const dots = '•'.repeat(opts.dots ?? 6);
    return `${signText}${sym}${sym ? ' ' : ''}${dots}`.replace(/\s+$/, '');
  }

  const abs = Math.abs(value);
  let text: string;
  if (cur.decimals === 0) {
    text = groupDigits(String(Math.round(abs / 100)));
  } else {
    const whole = Math.floor(abs / 100);
    const frac = abs % 100;
    text = groupDigits(String(whole));
    if (!(opts.trimZero && frac === 0)) text += '.' + String(frac).padStart(2, '0');
  }
  return `${signText}${sym}${text}`;
}

/** Whole numbers with thousands separators: 127630 → "127,630". */
export function formatCount(n: number, opts: { sign?: 'auto' | 'always'; hidden?: boolean } = {}): string {
  if (opts.hidden) return DOTS;
  const value = Math.round(Number.isFinite(n) ? n : 0);
  const signText = value < 0 ? MINUS : opts.sign === 'always' && value > 0 ? '+' : '';
  return signText + groupDigits(String(Math.abs(value)));
}

/**
 * Parse what someone typed into a money field ("1,234.5", "S$ 20", "-3.10") into cents.
 * Returns null when there is no number in it.
 */
export function parseMoneyInput(text: string): number | null {
  const negative = /^\s*[-−]/.test(text);
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!/\d/.test(cleaned)) return null;
  const firstDot = cleaned.indexOf('.');
  const normal =
    firstDot === -1 ? cleaned : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  const value = Number(normal);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  return negative ? -cents : cents;
}

/** Parse a whole number such as miles ("12,000" → 12000). */
export function parseCountInput(text: string): number | null {
  const negative = /^\s*[-−]/.test(text);
  const cleaned = text.replace(/[^0-9]/g, '');
  if (cleaned === '') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

/** Text for a money input field: 245000 → "2450.00", trimmed of a pointless ".00". */
export function centsToInput(cents: number, decimals: 0 | 2 = 2): string {
  const abs = Math.abs(Math.round(cents));
  const sign = cents < 0 ? '-' : '';
  if (decimals === 0) return sign + String(Math.round(abs / 100));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return sign + (frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, '0')}`);
}

/* ------------------------------------------------------------------ */
/* Keypad entry: the amount is kept as the string of keys pressed.    */
/* ------------------------------------------------------------------ */

export const KEYPAD_MAX_DIGITS = 9;

/** Apply one keypad press to the typed digits. Returns the same string when the key is refused. */
export function pressKey(digits: string, key: string, opts: { allowDecimal: boolean }): string {
  if (key === 'back') return digits.slice(0, -1);
  if (key === 'clear') return '';
  if (key === '.') {
    if (!opts.allowDecimal || digits.includes('.')) return digits;
    return (digits === '' ? '0' : digits) + '.';
  }
  if (!/^\d$/.test(key)) return digits;
  const dot = digits.indexOf('.');
  if (dot >= 0 && digits.length - dot > 2) return digits;
  if (digits.replace('.', '').length >= KEYPAD_MAX_DIGITS) return digits;
  if (digits === '0') return key;
  return digits + key;
}

/** Keypad digits → cents ("24.5" → 2450). */
export function digitsToCents(digits: string): number {
  if (!digits || digits === '.') return 0;
  const value = Number(digits);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

/** Keypad digits → whole number ("1240" → 1240). */
export function digitsToCount(digits: string): number {
  const value = Number(digits.replace('.', ''));
  return Number.isFinite(value) ? Math.round(value) : 0;
}

/** Cents → keypad digits (2450 → "24.5"; 2400 → "24"). */
export function centsToDigits(cents: number, decimals: 0 | 2 = 2): string {
  const abs = Math.abs(Math.round(cents));
  if (abs === 0) return '';
  if (decimals === 0) return String(Math.round(abs / 100));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  if (frac === 0) return String(whole);
  const fracText = String(frac).padStart(2, '0');
  return `${whole}.${fracText.endsWith('0') ? fracText[0] : fracText}`;
}

/** How the typed digits look on screen: "24850.5" → "24,850.5". */
export function displayDigits(digits: string): string {
  if (!digits) return '0';
  const [whole, frac] = digits.split('.');
  const grouped = groupDigits(whole === '' ? '0' : whole);
  return frac !== undefined ? `${grouped}.${frac}` : grouped;
}

/** Percentage of part in whole, clamped to 0..999 and rounded. */
export function percent(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return Math.max(0, Math.min(999, Math.round((part / whole) * 100)));
}
