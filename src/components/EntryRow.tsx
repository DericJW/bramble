import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useData } from '../data/DataProvider';
import { useMoney } from '../data/hooks';
import type { Entry } from '../data/types';
import { formatSmartDate } from '../lib/dates';
import { usePalette } from '../theme/theme';
import { Tile } from '../ui/Sprite';
import { Txt } from '../ui/Txt';
import { describeEntry } from './entryText';

/** Entries opened from a list are kept here so the edit screen can show them at once. */
const opened = new Map<string, Entry>();

export function rememberEntry(e: Entry) {
  opened.set(e.id, e);
}

export function recallEntry(id: string): Entry | undefined {
  return opened.get(id);
}

export function openEntry(e: Entry) {
  rememberEntry(e);
  router.push({ pathname: '/entry', params: { id: e.id } });
}

/** One line in a list of entries; tap to edit. */
export function EntryRow({ entry, subOverride, withDate }: { entry: Entry; subOverride?: string; withDate?: boolean }) {
  const data = useData();
  const { fmt, hidden } = useMoney();
  const c = usePalette();
  const line = describeEntry(entry, data, fmt, hidden);
  const color = line.tone === 'good' ? c.good : line.tone === 'warn' ? c.warnStrong : c.ink;
  const sub = subOverride ?? (withDate ? `${line.sub} \u00B7 ${formatSmartDate(entry.date)}` : line.sub);
  return (
    <Pressable onPress={() => openEntry(entry)} accessibilityRole="button" accessibilityLabel={`${line.title}, ${sub}, ${line.amount}`}>
      {({ pressed }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.6 : 1 }}>
          <Tile icon={line.icon} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Txt size={16} weight="bold" numberOfLines={1}>
              {line.title}
            </Txt>
            <Txt size={13} muted numberOfLines={1}>
              {sub}
            </Txt>
          </View>
          <Txt size={16} weight="bold" color={color}>
            {line.amount}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}
