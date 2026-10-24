import { Platform, type TextStyle } from 'react-native';

/**
 * Two typefaces from the design:
 * - Zen Maru Gothic, a soft rounded face that is easy to read, for body text and numbers.
 * - Pixelify Sans for titles, section headings and (optionally) everything else.
 *
 * On phones the fonts ship with the app (see fontAssets.ts) and each weight is its own
 * family name. On the web they come from Google Fonts (see public/index.html), so the
 * family is the real name and the weight is set normally.
 */

export type Face = 'rounded' | 'pixel';
export type Weight = 'medium' | 'bold';

const NATIVE: Record<Face, Record<Weight, string>> = {
  rounded: { medium: 'ZenMaruGothic_500Medium', bold: 'ZenMaruGothic_700Bold' },
  pixel: { medium: 'PixelifySans_500Medium', bold: 'PixelifySans_700Bold' },
};

const WEB: Record<Face, string> = {
  rounded: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'Segoe UI', sans-serif",
  pixel: "'Pixelify Sans', 'Courier New', monospace",
};

const cache = new Map<string, TextStyle>();

export function fontStyle(face: Face, weight: Weight): TextStyle {
  const key = face + weight;
  const hit = cache.get(key);
  if (hit) return hit;
  const style: TextStyle =
    Platform.OS === 'web'
      ? { fontFamily: WEB[face], fontWeight: weight === 'bold' ? '700' : '500' }
      : { fontFamily: NATIVE[face][weight] };
  cache.set(key, style);
  return style;
}
