import type { TabListProps, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { usePalette, useTheme } from '../theme/theme';
import { Icon } from '../ui/Sprite';
import { TAB_BAR_BASE } from '../ui/Screen';
import { Txt } from '../ui/Txt';

/** The grass and flowers growing along the top of the tab bar. */
function GrassStrip({ width, night }: { width: number; night: boolean }) {
  const dark = night ? '#1A3022' : '#4A853A';
  const light = night ? '#233D2C' : '#6FAE52';
  const stem = night ? '#2E5340' : '#4E8B3E';
  return (
    <Svg width={width} height={12} viewBox="0 0 130 4" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, top: -12 }}>
      <Path
        fill={dark}
        d="M2 1h1v3H2z M3 0h1v4H3z M4 2h1v2H4z M20 1h1v3h-1z M21 2h1v2h-1z M44 0h1v4h-1z M45 1h1v3h-1z M46 2h1v2h-1z M71 1h1v3h-1z M72 2h1v2h-1z M96 0h1v4h-1z M97 1h1v3h-1z M118 1h1v3h-1z M119 0h1v4h-1z M120 2h1v2h-1z"
      />
      <Path
        fill={light}
        d="M1 3h1v1H1z M5 3h2v1H5z M19 3h1v1h-1z M22 3h1v1h-1z M43 3h1v1h-1z M47 3h1v1h-1z M70 3h1v1h-1z M73 3h2v1h-2z M95 3h1v1h-1z M98 3h1v1h-1z M117 3h1v1h-1z M121 3h1v1h-1z"
      />
      <Path fill={stem} d="M32 2h1v2h-1z M108 2h1v2h-1z M58 2h1v2h-1z M84 2h1v2h-1z" />
      <Path fill={night ? '#FFE88A' : '#F7D86A'} d="M32 1h1v1h-1z M108 1h1v1h-1z" />
      <Path fill={night ? '#8E5E70' : '#F2A6B8'} d="M58 1h1v1h-1z M84 1h1v1h-1z" />
    </Svg>
  );
}

/** The wooden tab bar along the bottom of the five main screens. */
export function WoodTabBar({ children, ...rest }: TabListProps) {
  const { c, night, width } = useTheme();
  const insets = useSafeAreaInsets();
  const height = TAB_BAR_BASE + Math.max(insets.bottom, 8);
  return (
    <View
      {...rest}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height,
        backgroundColor: c.tab,
        borderTopWidth: 3,
        borderTopColor: c.border,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 8,
        paddingHorizontal: 4,
      }}
    >
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}>
        <View style={{ height: 3, backgroundColor: c.tabHi }} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: 24 + i * 30, height: 3, backgroundColor: c.tabSeam }} />
        ))}
      </View>
      <GrassStrip width={width} night={night} />
      {children}
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: string; label: string };

export function TabButton({ icon, label, isFocused, children: _children, ...rest }: TabButtonProps) {
  const c = usePalette();
  return (
    <Pressable
      {...rest}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused }}
      style={{ flex: 1, alignItems: 'center', gap: 4, minHeight: 48 }}
    >
      {isFocused ? (
        <View style={{ alignItems: 'center' }}>
          <View style={{ height: 3, width: 40, backgroundColor: c.border }} />
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 3, backgroundColor: c.border }} />
            <View style={{ width: 40, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: c.tabActiveBox }}>
              <Icon name={icon} size={22} color={c.tabActiveIcon} />
            </View>
            <View style={{ width: 3, backgroundColor: c.border }} />
          </View>
          <View style={{ height: 3, width: 40, backgroundColor: c.border }} />
        </View>
      ) : (
        <View style={{ width: 46, height: 34, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={22} color={c.tabIdle} />
        </View>
      )}
      <Txt size={label.length > 9 ? 11 : 12} lh={15} weight={isFocused ? 'bold' : 'medium'} color={isFocused ? c.tabActiveLabel : c.tabIdle} numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}
