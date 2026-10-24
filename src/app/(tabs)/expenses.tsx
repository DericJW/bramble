import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { EntryRow } from '../../components/EntryRow';
import { groupByDay, isExpense, monthStats, pouchStats, type PouchStat } from '../../data/calc';
import { useData } from '../../data/DataProvider';
import { useMoney, useMonthEntries } from '../../data/hooks';
import { addMonths, formatMonthYear, isSameMonth, MONTHS, startOfMonth } from '../../lib/dates';
import { AnimView } from '../../scenes/Anim';
import ExpensesScene from '../../scenes/ExpensesScene';
import { usePalette, useTheme } from '../../theme/theme';
import { StripeBar } from '../../ui/Bars';
import { IconButton, LinkButton, PxButton } from '../../ui/Buttons';
import { Frame, Plank, PressFrame } from '../../ui/Frame';
import { Chip } from '../../ui/Inputs';
import { Badge, Rows, SectionTitle } from '../../ui/Layout';
import { TabScreen } from '../../ui/Screen';
import { Icon, Sprite, Tile } from '../../ui/Sprite';
import { Label, Txt } from '../../ui/Txt';

export default function ExpensesScreen() {
  const { tone, now } = useTheme();
  const c = usePalette();
  const data = useData();
  const { fmt } = useMoney();
  const [month, setMonth] = useState(() => startOfMonth(now));
  const [filter, setFilter] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);
  const { entries, loading } = useMonthEntries(month);
  const stats = monthStats(entries, data.categories, month, now);
  const pouches = pouchStats(data.categories, stats.byCategory);
  const isCurrent = isSameMonth(month, now);
  const expenses = entries.filter(isExpense).filter((e) => !filter || e.categoryId === filter || (filter === '__other' && !data.categories.some((cat) => cat.id === e.categoryId)));
  const days = groupByDay(expenses.slice(0, limit), now);
  const hiddenCount = Math.max(0, expenses.length - limit);
  const filterName = filter ? (pouches.find((p) => p.id === filter)?.name ?? 'Other') : null;
  const addExpense = () => router.push({ pathname: '/entry', params: { type: 'expense' } });

  return (
    <TabScreen
      scene={(w) => <ExpensesScene width={w} tone={tone} />}
      kicker="Market day"
      title="Expenses"
      actions={<IconButton icon="iSearch" label="Search expenses" onPress={() => router.push('/search')} />}
      fab={{ label: 'Add expense', onPress: addExpense }}
    >
      <Frame innerStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 2 }}>
        <MonthButton icon="iChevLeft" label="Previous month" onPress={() => setMonth(addMonths(month, -1))} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Sprite name="calendar" size={18} />
          <Txt size={17} weight="bold">
            {formatMonthYear(month)}
          </Txt>
        </View>
        <MonthButton icon="iChevRight" label="Next month" disabled={isCurrent} onPress={() => setMonth(addMonths(month, 1))} />
      </Frame>

      <Plank innerStyle={{ padding: 19, gap: 14 }} deco={<Sprite name="coinStack" size={36} style={{ position: 'absolute', right: 27, top: -21 }} />}>
        <View style={{ gap: 4 }}>
          <Label color={c.woodLabel}>{isCurrent ? 'Spent this month' : `Spent in ${MONTHS[month.getMonth()]}`}</Label>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <Txt size={34} lh={40} weight="bold" color={c.woodNum} shadow={c.night ? '#0E0B09' : '#3B2A20'} shadowSize={3}>
              {fmt(stats.spent)}
            </Txt>
            {stats.budget > 0 ? (
              <Txt size={15} color={c.woodLabel}>
                {`of ${fmt(stats.budget, { trimZero: true, dots: 4 })}`}
              </Txt>
            ) : null}
          </View>
        </View>
        {stats.budget > 0 ? (
          <StripeBar
            pct={stats.pct}
            light={stats.left < 0 ? c.barWarn : c.barGold}
            dark={stats.left < 0 ? c.barWarnDark : c.barGoldDark}
            hi={stats.left < 0 ? undefined : c.barGoldHi}
            track="#4A2C18"
            border="#2A1A10"
          />
        ) : null}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <PlankStat label={stats.left < 0 ? 'Over by' : 'Left'} value={stats.budget > 0 ? fmt(Math.abs(stats.left)) : '–'} />
          <PlankStat label="Per day" value={stats.budget > 0 && stats.daysLeft > 0 ? fmt(stats.perDay) : '–'} />
          <PlankStat label="Days left" value={String(stats.daysLeft)} />
        </View>
      </Plank>

      <View style={{ gap: 14 }}>
        <SectionTitle title="Spending pouches" right={<LinkButton label="Edit budgets" onPress={() => router.push('/budgets')} />} />
        {pouches.length === 0 ? (
          <Frame innerStyle={{ padding: 16, gap: 12 }}>
            <Txt muted>No pouches yet. Add some to sort your spending.</Txt>
            <PxButton label="Add pouches" kind="secondary" onPress={() => router.push('/budgets')} />
          </Frame>
        ) : (
          <PouchGrid pouches={pouches} selected={filter} onSelect={(id) => setFilter(filter === id ? null : id)} />
        )}
      </View>

      <View style={{ gap: 12 }}>
        <SectionTitle title="Recent" />
        {filterName ? (
          <View style={{ flexDirection: 'row' }}>
            <Chip label={`${filterName}  ✕`} on onPress={() => setFilter(null)} />
          </View>
        ) : null}
        {loading ? (
          <Txt muted>Loading…</Txt>
        ) : days.length === 0 ? (
          <Frame innerStyle={{ padding: 16 }}>
            <Txt muted>{filterName ? `Nothing in ${filterName} this month.` : 'No spending logged for this month yet.'}</Txt>
          </Frame>
        ) : (
          days.map((day) => (
            <View key={day.key} style={{ gap: 8 }}>
              <Label size={12} style={{ paddingTop: 4 }}>
                {day.label}
              </Label>
              <Rows>
                {day.items.map((e) => (
                  <EntryRow key={e.id} entry={e} />
                ))}
              </Rows>
            </View>
          ))
        )}
        {hiddenCount > 0 ? <PxButton kind="secondary" label={`Show ${Math.min(hiddenCount, 50)} more`} onPress={() => setLimit(limit + 50)} /> : null}
      </View>
    </TabScreen>
  );
}

function MonthButton({ icon, label, onPress, disabled }: { icon: string; label: string; onPress: () => void; disabled?: boolean }) {
  const c = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={icon} size={20} color={disabled ? c.faint : c.ink} />
    </Pressable>
  );
}

function PlankStat({ label, value }: { label: string; value: string }) {
  const c = usePalette();
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Txt size={13} color={c.woodLabel}>
        {label}
      </Txt>
      <Txt size={16} weight="bold" color={c.woodValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
    </View>
  );
}

function PouchGrid({ pouches, selected, onSelect }: { pouches: PouchStat[]; selected: string | null; onSelect: (id: string) => void }) {
  const rows: PouchStat[][] = [];
  for (let i = 0; i < pouches.length; i += 2) rows.push(pouches.slice(i, i + 2));
  return (
    <View style={{ gap: 18 }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 16 }}>
          {row.map((p) => (
            <Pouch key={p.id} pouch={p} selected={selected === p.id} onPress={() => onSelect(p.id)} />
          ))}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

function Pouch({ pouch, selected, onPress }: { pouch: PouchStat; selected: boolean; onPress: () => void }) {
  const c = usePalette();
  const { fmt } = useMoney();
  const alert = pouch.status === 'near' || pouch.status === 'over';
  let footer: string;
  if (pouch.status === 'none') footer = pouch.orphan ? 'From removed pouches' : 'No budget set';
  else if (pouch.status === 'over') footer = `Over by ${fmt(-pouch.left, { trimZero: true, dots: 3 })}`;
  else if (pouch.status === 'near') footer = `Near limit · ${fmt(pouch.left, { trimZero: true, dots: 3 })} left`;
  else footer = `${fmt(pouch.left, { dots: 3 })} left of ${fmt(pouch.budget, { trimZero: true, dots: 3 })}`;
  return (
    <PressFrame
      style={{ flex: 1 }}
      fill
      border={alert ? c.warn : selected ? c.btn : undefined}
      inset={alert ? c.warnBg : selected ? c.tint.green : undefined}
      innerStyle={{ padding: alert || selected ? 9 : 12, gap: 8 }}
      onPress={onPress}
      accessibilityLabel={`${pouch.name}, ${fmt(pouch.spent)} spent. ${footer}`}
      deco={
        alert ? (
          <AnimView name="pxHop" dur={900} style={{ position: 'absolute', right: -7, top: -9 }}>
            <Sprite name="alertBadge" size={24} />
          </AnimView>
        ) : null
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <Tile icon={pouch.icon} />
        {pouch.status !== 'none' ? (
          <Badge text={`${pouch.pct}%`} color={alert ? '#FFF8E6' : c.night ? '#DDEBC8' : '#24502A'} bg={alert ? c.warn : c.tint.green} />
        ) : null}
      </View>
      <Txt size={14} weight="bold" numberOfLines={1}>
        {pouch.name}
      </Txt>
      <Txt size={18} lh={22} weight="bold" style={{ marginTop: -4 }} numberOfLines={1} adjustsFontSizeToFit>
        {fmt(pouch.spent)}
      </Txt>
      {pouch.status !== 'none' ? (
        <StripeBar
          pct={pouch.pct}
          height={9}
          light={alert ? c.barWarn : c.barGood}
          dark={alert ? c.barWarnDark : c.barGoodDark}
        />
      ) : null}
      <Txt size={12} lh={16} weight={alert ? 'bold' : 'medium'} color={alert ? c.warnStrong : c.muted}>
        {footer}
      </Txt>
    </PressFrame>
  );
}
