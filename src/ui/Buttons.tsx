import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { usePalette } from '../theme/theme';
import { Frame } from './Frame';
import { Icon } from './Sprite';
import { Txt } from './Txt';

type Kind = 'primary' | 'secondary' | 'danger' | 'gold';

type PxButtonProps = {
  label: string;
  onPress?: () => void;
  kind?: Kind;
  icon?: string;
  /** Any element shown before the label instead of a mono icon (for coloured sprites). */
  lead?: ReactNode;
  disabled?: boolean;
  busy?: boolean;
  height?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** The chunky pixel button. Presses down into its shadow. */
export function PxButton({
  label,
  onPress,
  kind = 'primary',
  icon,
  lead,
  disabled,
  busy,
  height = 48,
  size = 16,
  style,
  accessibilityLabel,
}: PxButtonProps) {
  const c = usePalette();
  const [down, setDown] = useState(false);
  const colors: Record<Kind, { bg: string; fg: string; hi?: string; lo?: string }> = {
    primary: { bg: c.btn, fg: c.btnText, hi: c.btnHi, lo: c.btnLo },
    secondary: { bg: c.card, fg: c.ink, lo: c.keyInset },
    danger: { bg: '#B0482A', fg: '#FFF8E6', hi: '#D9622B', lo: '#8A3418' },
    gold: { bg: '#E8B23A', fg: '#2A1A10', hi: '#F4CF6A', lo: '#C99528' },
  };
  const k = colors[kind];
  const inactive = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      style={style}
    >
      <Frame
        bg={k.bg}
        hi={k.hi}
        lo={k.lo}
        drop={down ? 'transparent' : c.shadow}
        dropSize={kind === 'secondary' ? 3 : 6}
        style={[down ? { transform: [{ translateY: kind === 'secondary' ? 3 : 4 }] } : null, inactive ? { opacity: 0.55 } : null]}
        innerStyle={{ height: height - 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 12 }}
      >
        {busy ? <ActivityIndicator color={k.fg} /> : null}
        {!busy && lead ? lead : null}
        {!busy && icon ? <Icon name={icon} size={20} color={k.fg} /> : null}
        <Txt size={size} weight="bold" color={k.fg} numberOfLines={1}>
          {label}
        </Txt>
      </Frame>
    </Pressable>
  );
}

type IconButtonProps = {
  icon: string;
  onPress?: () => void;
  label: string;
  size?: number;
  /** Look pressed (for toggles such as the privacy eye). */
  active?: boolean;
  /** Use a dusk outline (for the Liabilities scene). */
  dusk?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Square 44pt button with a pixel outline, used in the headers. */
export function IconButton({ icon, onPress, label, size = 44, active, dusk, style }: IconButtonProps) {
  const c = usePalette();
  const [down, setDown] = useState(false);
  const line = dusk ? '#2A2230' : c.border;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active === undefined ? undefined : { selected: active }}
      hitSlop={6}
      style={style}
    >
      <Frame
        border={line}
        drop={down ? 'transparent' : c.shadow}
        style={down ? { transform: [{ translateY: 3 }] } : null}
        innerStyle={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name={icon} size={24} />
      </Frame>
    </Pressable>
  );
}

/** Text-only action ("See all ›", "Edit budgets"). */
export function LinkButton({ label, onPress, color, size = 14 }: { label: string; onPress?: () => void; color?: string; size?: number }) {
  const c = usePalette();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
      {({ pressed }) => (
        <Txt size={size} weight="bold" color={color ?? c.link} style={pressed ? { opacity: 0.6 } : null}>
          {label}
        </Txt>
      )}
    </Pressable>
  );
}

/** A spacer that keeps header layouts balanced. */
export function Spacer({ w = 50, h = 44 }: { w?: number; h?: number }) {
  return <View style={{ width: w, height: h }} />;
}
