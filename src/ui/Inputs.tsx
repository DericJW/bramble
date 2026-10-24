import { forwardRef, type ReactNode } from 'react';
import { Pressable, ScrollView, TextInput, View, type TextInputProps } from 'react-native';

import { fontStyle } from '../theme/fonts';
import { useTheme } from '../theme/theme';
import { Frame } from './Frame';
import { Sprite } from './Sprite';
import { Label, Txt } from './Txt';

type ChipProps = { label: string; on: boolean; onPress: () => void; icon?: string };

/** A choice chip ("Food & drinks", "Earned"). */
export function Chip({ label, on, onPress, icon }: ChipProps) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label}>
      {({ pressed }) => (
        <Frame
          drop={null}
          bg={on ? c.chipOn : c.card}
          lo={on ? undefined : c.keyInset}
          style={pressed ? { opacity: 0.75 } : null}
          innerStyle={{ height: 32, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          {icon ? <Sprite name={icon} size={18} /> : null}
          <Txt weight="bold" color={on ? c.chipOnText : c.ink} numberOfLines={1}>
            {label}
          </Txt>
        </Frame>
      )}
    </Pressable>
  );
}

/** A sideways-scrolling row of chips that runs to the screen edges. */
export function ChipRow({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={label}
      style={{ marginHorizontal: -17 }}
      contentContainerStyle={{ paddingHorizontal: 17, paddingVertical: 2, gap: 10 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

type Option<T extends string> = { value: T; label: string };

/** The green segmented switch ("Expense | Balance | Miles | Owed"). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
  size,
  height = 40,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  /** Label size; smaller fits more options in a narrow space. */
  size?: number;
  height?: number;
}) {
  const { c } = useTheme();
  return (
    <Frame innerStyle={{ flexDirection: 'row', padding: 4, gap: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            disabled={disabled && !on}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on, disabled: !!disabled && !on }}
            style={{ flex: 1 }}
          >
            <View
              style={{
                height,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? c.btn : 'transparent',
                borderTopWidth: on ? 3 : 0,
                borderTopColor: c.btnHi,
                borderBottomWidth: on ? 3 : 0,
                borderBottomColor: c.btnLo,
                opacity: disabled && !on ? 0.4 : 1,
              }}
            >
              <Txt weight="bold" size={size} color={on ? c.btnText : c.ink} numberOfLines={1}>
                {o.label}
              </Txt>
            </View>
          </Pressable>
        );
      })}
    </Frame>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
  prefix?: string;
  suffix?: string;
};

/** Labelled text box in a pixel frame. */
export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, hint, error, prefix, suffix, style, ...input },
  ref,
) {
  const { c, night, body } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <Frame drop={null} innerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 }}>
        {prefix ? (
          <Txt muted weight="bold" size={16} numberOfLines={1} style={{ marginRight: 6, flexShrink: 0 }}>
            {prefix}
          </Txt>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.faint}
          keyboardAppearance={night ? 'dark' : 'light'}
          selectionColor={c.leaf}
          maxFontSizeMultiplier={1.35}
          {...input}
          style={[fontStyle(body, 'bold'), { flex: 1, minWidth: 0, fontSize: 16, color: c.ink, paddingVertical: 10 }, style]}
        />
        {suffix ? (
          // Never squeezed: on iPhone a text box can claim more width than it shows.
          <Txt muted weight="bold" size={15} numberOfLines={1} style={{ marginLeft: 6, flexShrink: 0 }}>
            {suffix}
          </Txt>
        ) : null}
      </Frame>
      {error ? (
        <Txt size={13} weight="bold" color={c.warnStrong}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt size={13} muted>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
});

/** A grid of sprite choices (account icon, pouch icon...). */
export function IconChoice({ icons, value, onChange }: { icons: readonly string[]; value: string; onChange: (v: string) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {icons.map((name) => {
        const on = name === value;
        return (
          <Pressable key={name} onPress={() => onChange(name)} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: on }}>
            <Frame
              drop={null}
              border={on ? c.btn : c.border}
              bg={on ? c.tint.green : c.card}
              innerStyle={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2 : 0, borderColor: c.btnHi }}
            >
              <Sprite name={name} size={30} />
            </Frame>
          </Pressable>
        );
      })}
    </View>
  );
}
