import { useState, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { usePalette } from '../theme/theme';

export type FrameProps = {
  children?: ReactNode;
  /** Fill colour (defaults to the card colour). */
  bg?: string;
  /** Pixel outline colour (defaults to ink). */
  border?: string;
  /** Colour of the hard drop below the card; null for none. */
  drop?: string | null;
  dropSize?: number;
  /** A second 3pt border just inside the outline. */
  inset?: string;
  /** 3pt highlight along the inside top, and shade along the inside bottom. */
  hi?: string;
  lo?: string;
  /** Outline thickness. */
  b?: number;
  /** Stretch to fill the parent's height (for grid tiles). */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  /** Extra things positioned around the card (critters, grass) – drawn on top, may overflow. */
  deco?: ReactNode;
};

/**
 * The pixel card: an outline with notched corners (as if drawn on a pixel grid) and a
 * hard drop underneath. The outline takes up layout space, so spacing stays predictable.
 */
export function Frame({
  children,
  bg,
  border,
  drop,
  dropSize = 3,
  inset,
  hi,
  lo,
  b = 3,
  fill,
  style,
  innerStyle,
  deco,
}: FrameProps) {
  const c = usePalette();
  const line = border ?? c.border;
  const dropColor = drop === undefined ? c.drop : drop;
  // Grow to fill a stretched card, but never collapse below the content's own size.
  const content: ViewStyle = { flexGrow: 1, flexShrink: 1, backgroundColor: bg ?? c.card };
  if (inset) {
    content.borderWidth = 3;
    content.borderColor = inset;
  }
  if (hi) {
    content.borderTopWidth = 3;
    content.borderTopColor = hi;
  }
  if (lo) {
    content.borderBottomWidth = 3;
    content.borderBottomColor = lo;
  }
  return (
    <View style={style}>
      <View style={{ height: b, marginHorizontal: b, backgroundColor: line }} />
      <View style={[{ flexDirection: 'row' }, fill ? { flexGrow: 1 } : null]}>
        <View style={{ width: b, backgroundColor: line }} />
        <View style={[content, innerStyle]}>{children}</View>
        <View style={{ width: b, backgroundColor: line }} />
      </View>
      <View style={{ height: b, marginHorizontal: b, backgroundColor: line }} />
      {dropColor ? <View style={{ height: dropSize, marginHorizontal: b, backgroundColor: dropColor }} /> : null}
      {deco}
    </View>
  );
}

type PressFrameProps = FrameProps & {
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
};

/** A card you can tap: it sinks into its drop while pressed. */
export function PressFrame({ onPress, onLongPress, accessibilityLabel, disabled, style, ...frame }: PressFrameProps) {
  const [down, setDown] = useState(false);
  const hasDrop = frame.drop !== null;
  const sink = hasDrop ? (frame.dropSize ?? 3) : 0;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      style={style}
    >
      <Frame
        {...frame}
        style={[
          frame.fill ? { flexGrow: 1 } : null,
          down ? (hasDrop ? { transform: [{ translateY: sink }] } : { opacity: 0.8 }) : null,
        ]}
        drop={hasDrop && down ? 'transparent' : frame.drop}
      />
    </Pressable>
  );
}

type PlankProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  deco?: ReactNode;
  /** Draw the four little nail heads in the corners. */
  rivets?: boolean;
};

/** A wooden board with horizontal seams, used for the net worth and monthly budget cards. */
export function Plank({ children, style, innerStyle, deco, rivets = true }: PlankProps) {
  const c = usePalette();
  return (
    <Frame
      bg={c.wood}
      hi={c.woodHi}
      drop={c.shadow}
      dropSize={6}
      style={style}
      deco={deco}
      innerStyle={[{ overflow: 'hidden' }, innerStyle]}
    >
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
        {Array.from({ length: 16 }, (_, i) => (
          <View
            key={i}
            style={{ position: 'absolute', left: 0, right: 0, top: 24 + i * 30, height: 3, backgroundColor: c.woodSeam }}
          />
        ))}
        {rivets ? (
          <>
            <Rivet style={{ left: 5, top: 7 }} />
            <Rivet style={{ right: 7, top: 7 }} />
            <Rivet style={{ left: 5, bottom: 9 }} />
            <Rivet style={{ right: 7, bottom: 9 }} />
          </>
        ) : null}
      </View>
      {children}
    </Frame>
  );
}

function Rivet({ style }: { style: ViewStyle }) {
  const c = usePalette();
  return (
    <View style={[{ position: 'absolute', width: 8, height: 8 }, style]}>
      <View style={{ position: 'absolute', left: 2, top: 2, width: 6, height: 6, backgroundColor: c.rivetShadow }} />
      <View style={{ position: 'absolute', left: 0, top: 0, width: 6, height: 6, backgroundColor: c.rivet }} />
    </View>
  );
}

/** A 3pt dashed line, like the separators between list rows. */
export function Dashed({ color, dash = 9, gap = 6, height = 3, style }: { color?: string; dash?: number; gap?: number; height?: number; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  const col = color ?? c.dash;
  return (
    <View style={[{ height, flexDirection: 'row', overflow: 'hidden' }, style]}>
      {Array.from({ length: 48 }, (_, i) => (
        <View key={i} style={{ width: dash, height, marginRight: gap, backgroundColor: col }} />
      ))}
    </View>
  );
}
