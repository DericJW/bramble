import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { usePalette } from '../theme/theme';
import { Dashed, Frame } from './Frame';
import { Icon, Sprite } from './Sprite';
import { Txt } from './Txt';

/** Section heading with the little leaf, and an optional action on the right. */
export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        <Sprite name="iLeaf" size={18} color={c.leaf} />
        <Txt face="pixel" weight="bold" size={19} lh={24} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Txt>
      </View>
      {right}
    </View>
  );
}

/** A card holding rows, with dashed lines between them. `bare` drops the card (for rows inside another card). */
export function Rows({ children, style, pad = 16, bare }: { children: ReactNode; style?: StyleProp<ViewStyle>; pad?: number; bare?: boolean }) {
  const items = Children.toArray(children).filter((x) => isValidElement(x));
  const list = items.map((child, i) => (
    <Fragment key={i}>
      {i > 0 ? <Dashed /> : null}
      {child}
    </Fragment>
  ));
  if (bare) return <View style={style}>{list}</View>;
  return (
    <Frame style={style} innerStyle={{ paddingHorizontal: pad }}>
      {list}
    </Frame>
  );
}

type RowButtonProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  valueColor?: string;
  chevron?: boolean;
  disabled?: boolean;
};

/** "Paid from    Daily spending  ›" */
export function RowButton({ label, value, onPress, valueColor, chevron = true, disabled }: RowButtonProps) {
  const c = usePalette();
  const content = (
    <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Txt muted style={{ flex: 1 }}>
        {label}
      </Txt>
      {value !== undefined ? (
        <Txt weight="bold" color={valueColor} numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>
          {value}
        </Txt>
      ) : null}
      {chevron && onPress && !disabled ? <Icon name="iChevRight" size={14} color={c.faint} /> : null}
    </View>
  );
  if (!onPress || disabled) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={value ? `${label}: ${value}` : label}>
      {({ pressed }) => <View style={pressed ? { opacity: 0.6 } : null}>{content}</View>}
    </Pressable>
  );
}

/** A pixel on/off switch. */
export function PxSwitch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const c = usePalette();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
    >
      <Frame drop={null} bg={value ? c.btn : c.track} innerStyle={{ width: 46, height: 24, padding: 3, alignItems: value ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 18, height: 18, backgroundColor: value ? '#FFF8E6' : c.faint }} />
      </Frame>
    </Pressable>
  );
}

/** Label on the left, switch on the right. */
export function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt weight="bold">{label}</Txt>
        {hint ? (
          <Txt size={13} muted>
            {hint}
          </Txt>
        ) : null}
      </View>
      <PxSwitch value={value} onChange={onChange} label={label} />
    </View>
  );
}

/** Friendly empty state inside a card. */
export function Empty({ icon = 'sparkle', title, body, action }: { icon?: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <Frame innerStyle={{ padding: 18, alignItems: 'center', gap: 10 }}>
      <Sprite name={icon} size={42} />
      <Txt weight="bold" size={16} center>
        {title}
      </Txt>
      {body ? (
        <Txt muted center size={14}>
          {body}
        </Txt>
      ) : null}
      {action}
    </Frame>
  );
}

/** Small coloured badge ("Count due", "59%"). */
export function Badge({ text, color, bg, edge }: { text: string; color: string; bg: string; edge?: string }) {
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 6, paddingVertical: 2, borderWidth: edge ? 2 : 0, borderColor: edge }}>
      <Txt size={12} lh={16} weight="bold" color={color}>
        {text}
      </Txt>
    </View>
  );
}
