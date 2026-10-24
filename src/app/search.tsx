import { useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { EntryRow } from '../components/EntryRow';
import { sortEntries } from '../data/calc';
import { useData } from '../data/DataProvider';
import { fetchAllExpenses } from '../data/repo';
import type { Entry } from '../data/types';
import { formatMonthYear, monthKey } from '../lib/dates';
import { centsToInput, formatMoney } from '../lib/money';
import { fontStyle } from '../theme/fonts';
import { usePalette, useTheme } from '../theme/theme';
import { Frame } from '../ui/Frame';
import { Rows } from '../ui/Layout';
import { SubScreen } from '../ui/Screen';
import { Icon } from '../ui/Sprite';
import { Label, Txt } from '../ui/Txt';

export default function SearchScreen() {
  const data = useData();
  const c = usePalette();
  const { night, body } = useTheme();
  const [all, setAll] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!data.uid) return;
    let alive = true;
    fetchAllExpenses(data.uid)
      .then((list) => {
        if (alive) setAll(sortEntries(list));
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [data.uid]);

  const results = useMemo(() => {
    if (!all) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return all.slice(0, 60);
    return all
      .filter((e) => {
        if (e.type !== 'expense') return false;
        const cat = data.categories.find((x) => x.id === e.categoryId)?.name ?? 'other';
        const amount = `${centsToInput(e.amount)} ${formatMoney(e.amount, data.settings.currency)}`.toLowerCase();
        return e.note.toLowerCase().includes(needle) || cat.toLowerCase().includes(needle) || amount.includes(needle);
      })
      .slice(0, 200);
  }, [all, q, data.categories, data.settings.currency]);

  const groups: { key: string; label: string; items: Entry[] }[] = [];
  for (const e of results) {
    const key = monthKey(e.date);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: formatMonthYear(e.date), items: [] };
      groups.push(g);
    }
    g.items.push(e);
  }

  return (
    <SubScreen title="Search spending">
      <Frame drop={null} innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 }}>
        <Icon name="iSearch" size={20} color={c.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          autoFocus
          placeholder="Note, pouch or amount"
          placeholderTextColor={c.faint}
          keyboardAppearance={night ? 'dark' : 'light'}
          returnKeyType="search"
          maxFontSizeMultiplier={1.35}
          style={[fontStyle(body, 'bold'), { flex: 1, fontSize: 16, color: c.ink, paddingVertical: 12 }]}
        />
      </Frame>
      {failed ? (
        <Txt muted>Couldn’t load your spending. Check your connection.</Txt>
      ) : !all ? (
        <Txt muted>Gathering every receipt…</Txt>
      ) : groups.length === 0 ? (
        <Txt muted>{q ? 'Nothing matches that.' : 'No spending logged yet.'}</Txt>
      ) : (
        groups.map((g) => (
          <View key={g.key} style={{ gap: 8 }}>
            <Label size={12}>{g.label}</Label>
            <Rows>
              {g.items.map((e) => (
                <EntryRow key={e.id} entry={e} withDate />
              ))}
            </Rows>
          </View>
        ))
      )}
    </SubScreen>
  );
}
