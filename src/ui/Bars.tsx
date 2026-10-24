import type { ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { usePalette } from '../theme/theme';
import { Frame } from './Frame';

function clampPct(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(100, p));
}

type StripeBarProps = {
  /** 0..100 */
  pct: number;
  height?: number;
  light: string;
  dark: string;
  hi?: string;
  track?: string;
  border?: string;
  style?: StyleProp<ViewStyle>;
  /** Markers drawn over the bar (positioned absolutely inside the track). */
  children?: ReactNode;
};

/** A pixel progress bar with a striped fill (9pt light, 3pt dark), like the budget bars. */
export function StripeBar({ pct, height = 15, light, dark, hi, track, border, style, children }: StripeBarProps) {
  const c = usePalette();
  const width = `${clampPct(pct)}%` as DimensionValue;
  return (
    <Frame drop={null} border={border} style={style} innerStyle={{ height, backgroundColor: track ?? c.track }}>
      <View style={{ width, height: '100%', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
          {Array.from({ length: 50 }, (_, i) => (
            <View key={i} style={{ flexDirection: 'row' }}>
              <View style={{ width: 9, backgroundColor: light }} />
              <View style={{ width: 3, backgroundColor: dark }} />
            </View>
          ))}
        </View>
        {hi ? <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, backgroundColor: hi }} /> : null}
      </View>
      {children}
    </Frame>
  );
}

/** The thin solid bar on the home "Spent" tile. */
export function MiniBar({ pct, color, height = 6, style }: { pct: number; color: string; height?: number; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  const width = `${clampPct(pct)}%` as DimensionValue;
  return (
    <Frame drop={null} style={style} innerStyle={{ height, backgroundColor: c.track }}>
      <View style={{ width, height: '100%', backgroundColor: color }} />
    </Frame>
  );
}

export type Segment = { key: string; weight: number; color: string; hi?: string };

/** A bar split into coloured parts (what you owe, by type). */
export function SegmentBar({ segments, height = 15, style }: { segments: Segment[]; height?: number; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  const parts = segments.filter((s) => s.weight > 0);
  return (
    <Frame drop={null} style={style} innerStyle={{ height, backgroundColor: c.border, flexDirection: 'row', gap: 3 }}>
      {parts.length === 0 ? <View style={{ flex: 1, backgroundColor: c.track }} /> : null}
      {parts.map((s) => (
        <View key={s.key} style={{ flexGrow: s.weight, flexShrink: 1, flexBasis: 0, minWidth: 6, backgroundColor: s.color }}>
          {s.hi ? <View style={{ height: 3, backgroundColor: s.hi }} /> : null}
        </View>
      ))}
    </Frame>
  );
}
