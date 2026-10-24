import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { addDays, addMonths, formatMonthYear, isSameDay, monthGrid, startOfMonth, WEEKDAYS_LETTER, atNoon } from '../lib/dates';
import { usePalette, useTheme } from '../theme/theme';
import { IconButton, PxButton } from './Buttons';
import { Dashed, Frame } from './Frame';
import { Sheet } from './Overlays';
import { Icon, Tile } from './Sprite';
import { Txt } from './Txt';

export type OptionItem = {
  key: string;
  label: string;
  sub?: string;
  icon?: string;
  right?: string;
};

type OptionSheetProps = {
  visible: boolean;
  title: string;
  options: OptionItem[];
  value: string | null;
  onPick: (key: string) => void;
  onClose: () => void;
  footer?: ReactNode;
  empty?: string;
};

/** A list of choices in a bottom sheet (pick an account, a program, a currency...). */
export function OptionSheet({ visible, title, options, value, onPick, onClose, footer, empty }: OptionSheetProps) {
  const c = usePalette();
  return (
    <Sheet visible={visible} title={title} onClose={onClose} footer={footer}>
      {options.length === 0 && empty ? (
        <Txt muted style={{ paddingVertical: 12 }}>
          {empty}
        </Txt>
      ) : null}
      {options.map((o, i) => {
        const on = o.key === value;
        return (
          <View key={o.key}>
            {i > 0 ? <Dashed /> : null}
            <Pressable
              onPress={() => {
                onPick(o.key);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.sub ? `${o.label}, ${o.sub}` : o.label}
            >
              {({ pressed }) => (
                <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, opacity: pressed ? 0.6 : 1 }}>
                  {o.icon ? <Tile icon={o.icon} size={40} /> : null}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt weight="bold">{o.label}</Txt>
                    {o.sub ? (
                      <Txt size={13} muted>
                        {o.sub}
                      </Txt>
                    ) : null}
                  </View>
                  {o.right ? (
                    <Txt weight="bold" muted>
                      {o.right}
                    </Txt>
                  ) : null}
                  {on ? <Icon name="iCheck" size={20} color={c.good} /> : null}
                </View>
              )}
            </Pressable>
          </View>
        );
      })}
    </Sheet>
  );
}

type DateSheetProps = {
  visible: boolean;
  title?: string;
  value: Date | null;
  onPick: (d: Date) => void;
  onClose: () => void;
  /** Offer a "No date" button. */
  onClear?: () => void;
  /** Show "Today" / "Yesterday" shortcuts (for things that already happened). */
  past?: boolean;
};

/** A little pixel calendar. */
export function DateSheet({ visible, title = 'Pick a date', value, onPick, onClose, onClear, past = true }: DateSheetProps) {
  const { c, now } = useTheme();
  const [month, setMonth] = useState(() => startOfMonth(value ?? now));

  const valueTime = value ? value.getTime() : 0;
  useEffect(() => {
    if (visible) setMonth(startOfMonth(valueTime ? new Date(valueTime) : new Date()));
  }, [visible, valueTime]);

  const pick = (d: Date) => {
    onPick(atNoon(d));
    onClose();
  };

  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {past ? (
            <>
              <PxButton kind="secondary" label="Today" height={42} size={15} onPress={() => pick(now)} style={{ flex: 1 }} />
              <PxButton kind="secondary" label="Yesterday" height={42} size={15} onPress={() => pick(addDays(now, -1))} style={{ flex: 1 }} />
            </>
          ) : (
            <>
              <PxButton kind="secondary" label="Next month" height={42} size={15} onPress={() => pick(addMonths(value ?? now, 1))} style={{ flex: 1 }} />
              {onClear ? (
                <PxButton
                  kind="secondary"
                  label="No date"
                  height={42}
                  size={15}
                  onPress={() => {
                    onClear();
                    onClose();
                  }}
                  style={{ flex: 1 }}
                />
              ) : null}
            </>
          )}
        </View>
        <Frame drop={null} innerStyle={{ padding: 8, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton icon="iChevLeft" label="Previous month" size={36} onPress={() => setMonth(addMonths(month, -1))} />
            <Txt weight="bold" size={16}>
              {formatMonthYear(month)}
            </Txt>
            <IconButton icon="iChevRight" label="Next month" size={36} onPress={() => setMonth(addMonths(month, 1))} />
          </View>
          <View style={{ flexDirection: 'row' }}>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <Txt key={d} size={12} weight="bold" muted center style={{ flex: 1 }}>
                {WEEKDAYS_LETTER[d]}
              </Txt>
            ))}
          </View>
          {monthGrid(month).map((week, wi) => (
            <View key={wi} style={{ flexDirection: 'row' }}>
              {week.map((day, di) => {
                if (!day) return <View key={di} style={{ flex: 1, height: 40 }} />;
                const selected = value ? isSameDay(day, value) : false;
                const today = isSameDay(day, now);
                return (
                  <Pressable
                    key={di}
                    style={{ flex: 1, height: 40, padding: 2 }}
                    onPress={() => pick(day)}
                    accessibilityRole="button"
                    accessibilityLabel={day.toDateString()}
                    accessibilityState={{ selected }}
                  >
                    <View
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? c.btn : 'transparent',
                        borderWidth: today && !selected ? 2 : 0,
                        borderColor: c.leaf,
                      }}
                    >
                      <Txt weight="bold" color={selected ? c.btnText : c.ink}>
                        {String(day.getDate())}
                      </Txt>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Frame>
        {past && onClear ? (
          <PxButton
            kind="secondary"
            label="No date"
            height={42}
            size={15}
            onPress={() => {
              onClear();
              onClose();
            }}
          />
        ) : null}
      </View>
    </Sheet>
  );
}
