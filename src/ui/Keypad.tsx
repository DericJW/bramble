import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { usePalette } from '../theme/theme';
import { Frame } from './Frame';
import { Icon } from './Sprite';
import { Txt } from './Txt';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const;

type KeypadProps = {
  onKey: (key: string) => void;
  allowDecimal: boolean;
  keyHeight?: number;
  /** Space between rows of keys. */
  rowGap?: number;
};

/** The chunky number pad from the entry screen. Long-press ⌫ to clear. */
export function Keypad({ onKey, allowDecimal, keyHeight = 46, rowGap = 10 }: KeypadProps) {
  const rows = [KEYS.slice(0, 3), KEYS.slice(3, 6), KEYS.slice(6, 9), KEYS.slice(9, 12)];
  return (
    <View style={{ gap: rowGap }} accessibilityLabel="Number pad">
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
          {row.map((k) => (
            <Key key={k} k={k} onKey={onKey} disabled={k === '.' && !allowDecimal} height={keyHeight} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Key({ k, onKey, disabled, height }: { k: string; onKey: (key: string) => void; disabled: boolean; height: number }) {
  const c = usePalette();
  const [down, setDown] = useState(false);
  if (disabled) return <View style={{ flex: 1, height: height + 3 }} />;
  const label = k === 'back' ? 'Delete last digit' : k === '.' ? 'Decimal point' : k;
  return (
    <Pressable
      style={{ flex: 1 }}
      onPress={() => onKey(k)}
      onLongPress={k === 'back' ? () => onKey('clear') : undefined}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Frame
        lo={c.keyInset}
        drop={down ? 'transparent' : c.drop}
        style={down ? { transform: [{ translateY: 3 }] } : null}
        innerStyle={{ height: height - 6, alignItems: 'center', justifyContent: 'center' }}
      >
        {k === 'back' ? (
          <Icon name="iBack" size={26} />
        ) : (
          <Txt size={24} lh={28} weight="bold">
            {k}
          </Txt>
        )}
      </Frame>
    </Pressable>
  );
}
