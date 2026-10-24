/**
 * The little stepped animations from the design (clouds drifting, chimney smoke, blinking
 * eyes...), written as plain functions of time so any element can follow them.
 *
 * Each animation maps progress p (0..1 through one cycle) to an offset and, for some, an
 * opacity. The timings copy the CSS keyframes and step counts used in the mock-ups.
 */

export type AnimName =
  | 'pxA'
  | 'pxB'
  | 'pxDrift'
  | 'pxHop'
  | 'pxBob'
  | 'pxSway'
  | 'pxRise'
  | 'pxRise10'
  | 'pxFloat'
  | 'pxBlink'
  | 'pxBlinkB'
  | 'pxScroll'
  | 'pxTwinkle'
  | 'pxFlicker'
  | 'pxShoot';

export type AnimDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';

export type AnimSpec = {
  name: AnimName;
  /** Length of one cycle in ms. */
  dur: number;
  /** CSS-style delay in ms (negative starts part way through). */
  delay?: number;
  dir?: AnimDirection;
};

export type AnimFrame = { x: number; y: number; o: number | null };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Piecewise-linear opacity through [p, value] stops. */
function stops(p: number, pts: [number, number][]): number {
  if (p <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [p1, v1] = pts[i];
    const [p0, v0] = pts[i - 1];
    if (p <= p1) return lerp(v0, v1, (p - p0) / (p1 - p0 || 1));
  }
  return pts[pts.length - 1][1];
}

const FLOAT_PATH: [number, number][] = [
  [0, 0],
  [3, -2],
  [6, 0],
  [3, 2],
  [0, 0],
];

export function frameAt(name: AnimName, p: number): AnimFrame {
  switch (name) {
    case 'pxA':
      return { x: 0, y: 0, o: p < 0.5 ? 1 : 0 };
    case 'pxB':
      return { x: 0, y: 0, o: p < 0.5 ? 0 : 1 };
    case 'pxDrift':
      return { x: Math.min(5, Math.floor(p * 6)), y: 0, o: null };
    case 'pxHop': {
      const y = [0, -1.5, -3, -1.5][Math.min(3, Math.floor(p * 4))];
      return { x: 0, y, o: null };
    }
    case 'pxBob':
      return { x: 0, y: p < 0.5 ? 0 : -1, o: null };
    case 'pxSway':
      return { x: [0, 1, 0, -1][Math.min(3, Math.floor(p * 4))], y: 0, o: null };
    case 'pxRise':
    case 'pxRise10': {
      const dy = name === 'pxRise' ? -14 : -10;
      const o = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
      return { x: Math.round(4 * p), y: Math.round(dy * p), o: Math.max(0, Math.min(1, o)) };
    }
    case 'pxFloat': {
      const seg = Math.min(3, Math.floor(p * 4));
      const t = p * 4 - seg;
      const [x0, y0] = FLOAT_PATH[seg];
      const [x1, y1] = FLOAT_PATH[seg + 1];
      return { x: Math.round(lerp(x0, x1, t)), y: Math.round(lerp(y0, y1, t)), o: null };
    }
    case 'pxBlink':
      return { x: 0, y: 0, o: p < 0.95 ? 1 : 0 };
    case 'pxBlinkB':
      return { x: 0, y: 0, o: p < 0.95 ? 0 : 1 };
    case 'pxScroll':
      return { x: -Math.min(129, Math.floor(p * 130)), y: 0, o: null };
    case 'pxTwinkle':
      return { x: 0, y: 0, o: [1, 0.6, 0.2, 0.6][Math.min(3, Math.floor(p * 4))] };
    case 'pxFlicker':
      return { x: 0, y: 0, o: stops(p, [[0, 1], [0.46, 0.7], [0.5, 0.45], [0.54, 0.85], [1, 1]]) };
    case 'pxShoot': {
      if (p >= 0.12) return { x: -36, y: 18, o: 0 };
      const t = p / 0.12;
      const o = p < 0.03 ? p / 0.03 : 1 - (p - 0.03) / 0.09;
      return { x: Math.round(-36 * t), y: Math.round(18 * t), o: Math.max(0, Math.min(1, o)) };
    }
  }
}

/** Progress through the current cycle at time t (ms), honouring delay and direction. */
export function progressAt(spec: AnimSpec, t: number): number {
  const dur = Math.max(1, spec.dur);
  const elapsed = t - (spec.delay ?? 0);
  const cycle = Math.floor(elapsed / dur);
  let p = (elapsed - cycle * dur) / dur;
  const dir = spec.dir ?? 'normal';
  const odd = Math.abs(cycle) % 2 === 1;
  if (dir === 'reverse' || (dir === 'alternate' && odd) || (dir === 'alternate-reverse' && !odd)) {
    p = 1 - p;
    if (p >= 1) p = 0.999999;
  }
  return p;
}

/** Quantised frame as a compact string, so React only re-renders when something visible changes. */
export function frameKey(spec: AnimSpec, t: number): string {
  const f = frameAt(spec.name, progressAt(spec, t));
  const o = f.o === null ? '' : String(Math.round(f.o * 20) / 20);
  return `${f.x}|${f.y}|${o}`;
}

export function parseFrameKey(key: string): AnimFrame {
  const [x, y, o] = key.split('|');
  return { x: Number(x), y: Number(y), o: o === '' || o === undefined ? null : Number(o) };
}

/** Which named animations change opacity (the others only move things). */
export function animatesOpacity(name: AnimName): boolean {
  return (
    name === 'pxA' ||
    name === 'pxB' ||
    name === 'pxRise' ||
    name === 'pxRise10' ||
    name === 'pxBlink' ||
    name === 'pxBlinkB' ||
    name === 'pxTwinkle' ||
    name === 'pxFlicker' ||
    name === 'pxShoot'
  );
}
