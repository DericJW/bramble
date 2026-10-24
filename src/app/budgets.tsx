import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useData } from '../data/DataProvider';
import { useMoney } from '../data/hooks';
import { saveCategories, type CategoryInput } from '../data/repo';
import { centsToInput, parseMoneyInput } from '../lib/money';
import { CATEGORY_ICONS } from '../sprites';
import { fontStyle } from '../theme/fonts';
import { usePalette, useTheme } from '../theme/theme';
import { IconButton, PxButton } from '../ui/Buttons';
import { Frame } from '../ui/Frame';
import { IconChoice } from '../ui/Inputs';
import { useToast, Sheet } from '../ui/Overlays';
import { SubScreen } from '../ui/Screen';
import { Tile } from '../ui/Sprite';
import { Label, Txt } from '../ui/Txt';

type Row = { key: string; id?: string; name: string; icon: string; budget: string };

let tempKey = 0;

export default function BudgetsScreen() {
  const data = useData();
  const { fmt, currency } = useMoney();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>(() =>
    data.categories.map((cat) => ({
      key: cat.id,
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      budget: cat.budget > 0 ? centsToInput(cat.budget, currency.decimals) : '',
    })),
  );
  const [removed, setRemoved] = useState<string[]>([]);
  const [iconFor, setIconFor] = useState<string | null>(null);

  const update = (key: string, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = () => {
    tempKey += 1;
    setRows((list) => [...list, { key: `new-${tempKey}`, name: '', icon: 'sparkle', budget: '' }]);
  };
  const remove = (r: Row) => {
    setRows((list) => list.filter((x) => x.key !== r.key));
    if (r.id) setRemoved((ids) => [...ids, r.id as string]);
  };

  const parsed = rows.map((r) => ({ row: r, cents: r.budget.trim() === '' ? 0 : parseMoneyInput(r.budget) }));
  const bad = parsed.some((p) => p.cents === null || (p.cents ?? 0) < 0);
  const total = parsed.reduce((t, p) => t + (p.cents ?? 0), 0);

  const save = () => {
    if (bad) return;
    const list: CategoryInput[] = parsed
      .filter((p) => p.row.name.trim() !== '' || p.row.id)
      .map((p, i) => ({ id: p.row.id, name: p.row.name.trim() || 'Pouch', icon: p.row.icon, budget: p.cents ?? 0, order: i }));
    saveCategories(list, removed).catch(() => toast.show('Couldn’t save your budgets. Please try again.', 'warn'));
    toast.show('Budgets saved');
    router.back();
  };

  const editing = rows.find((r) => r.key === iconFor) ?? null;

  return (
    <SubScreen
      title="Budgets"
      footer={<PxButton label="Save budgets" icon="iCheck" height={52} disabled={bad} onPress={save} />}
    >
      <Frame innerStyle={{ padding: 16, gap: 4 }}>
        <Label>Monthly budget</Label>
        <Txt size={28} lh={34} weight="bold">
          {fmt(total, { hidden: false })}
        </Txt>
        <Txt size={13} muted lh={18}>
          The total of your pouches. Leave a pouch empty if you just want to track it without a limit.
        </Txt>
      </Frame>

      <View style={{ gap: 14 }}>
        {rows.map((r) => (
          <BudgetRow
            key={r.key}
            row={r}
            symbol={currency.symbol}
            onChange={(patch) => update(r.key, patch)}
            onRemove={() => remove(r)}
            onIcon={() => setIconFor(r.key)}
          />
        ))}
      </View>

      <PxButton label="Add a pouch" kind="secondary" icon="iPlus" onPress={add} />

      <Sheet visible={!!editing} title="Pick a picture" onClose={() => setIconFor(null)}>
        {editing ? (
          <IconChoice
            icons={CATEGORY_ICONS}
            value={editing.icon}
            onChange={(icon) => {
              update(editing.key, { icon });
              setIconFor(null);
            }}
          />
        ) : null}
      </Sheet>
    </SubScreen>
  );
}

function BudgetRow({
  row,
  symbol,
  onChange,
  onRemove,
  onIcon,
}: {
  row: Row;
  symbol: string;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
  onIcon: () => void;
}) {
  const c = usePalette();
  const { night, body } = useTheme();
  const bad = row.budget.trim() !== '' && parseMoneyInput(row.budget) === null;
  const input = [fontStyle(body, 'bold'), { fontSize: 16, color: c.ink, paddingVertical: 8 }];
  return (
    <Frame border={bad ? c.warn : undefined} innerStyle={{ padding: 10, gap: 10, flexDirection: 'row', alignItems: 'center' }}>
      <Pressable onPress={onIcon} accessibilityRole="button" accessibilityLabel="Change picture">
        <Tile icon={row.icon} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <TextInput
          value={row.name}
          onChangeText={(name) => onChange({ name })}
          placeholder="Pouch name"
          placeholderTextColor={c.faint}
          keyboardAppearance={night ? 'dark' : 'light'}
          maxLength={30}
          maxFontSizeMultiplier={1.35}
          style={input}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 2, borderTopColor: c.dash }}>
          <Txt size={14} weight="bold" muted>
            {symbol}
          </Txt>
          <TextInput
            value={row.budget}
            onChangeText={(budget) => onChange({ budget })}
            placeholder="No limit"
            placeholderTextColor={c.faint}
            keyboardType="decimal-pad"
            keyboardAppearance={night ? 'dark' : 'light'}
            maxFontSizeMultiplier={1.35}
            style={[input, { flex: 1 }]}
          />
          <Txt size={13} muted>
            a month
          </Txt>
        </View>
      </View>
      <IconButton icon="iTrash" label={`Remove ${row.name || 'pouch'}`} size={38} onPress={onRemove} />
    </Frame>
  );
}
