/**
 * Turns a daytime scene into a moonlit one. Most colours are darkened and pulled towards
 * night blue; lamps, lit windows and stars keep (or gain) their glow.
 */

export type Tone = 'day' | 'night';

/** Colours that are light sources and stay bright at night. */
const GLOW = new Set([
  '#FFD66B',
  '#FFE59A',
  '#FFF3C4',
  '#FFE88A',
  '#F7D86A',
  '#FFF1BC',
  '#FFFBEA',
  '#F4CF6A',
]);

/** Colours that change meaning at night (sun rays become starlight, windows light up). */
const SWAP: Record<string, string> = {
  '#8FC8E8': '#FFD66B',
  '#DDF1FA': '#FFF3C4',
  '#FFE9A8': '#FFF3C4',
  '#BFE3F3': '#FFE59A',
};

const cache = new Map<string, string>();

function hex2(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();
}

export function toNight(color: string): string {
  const key = color.toUpperCase();
  const hit = cache.get(key);
  if (hit) return hit;
  let out: string;
  if (GLOW.has(key)) out = key;
  else if (SWAP[key]) out = SWAP[key];
  else {
    const m = /^#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/.exec(key);
    if (!m) out = color;
    else {
      const r = parseInt(m[1], 16);
      const g = parseInt(m[2], 16);
      const b = parseInt(m[3], 16);
      out = `#${hex2(r * 0.3 + 6)}${hex2(g * 0.34 + 12)}${hex2(b * 0.36 + 30)}`;
    }
  }
  cache.set(key, out);
  return out;
}

const identity = (c: string) => c;

export function toneFn(tone: Tone): (c: string) => string {
  return tone === 'night' ? toNight : identity;
}
