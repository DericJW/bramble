import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View, type DimensionValue } from 'react-native';

import { changeSince, homeTip, liabilitySummary, milesSummary, monthStats, nextDue, upcoming, worthOf, type UpcomingItem } from '../../data/calc';
import { useData } from '../../data/DataProvider';
import { useMoney } from '../../data/hooks';
import { formatHeaderDate, formatLongDate, formatShortDate, greeting, inDaysText, MONTHS, MONTHS_SHORT } from '../../lib/dates';
import { formatCount } from '../../lib/money';
import HomeDayScene from '../../scenes/HomeDayScene';
import HomeNightScene from '../../scenes/HomeNightScene';
import { AnimView } from '../../scenes/Anim';
import { usePrefs } from '../../theme/prefs';
import { usePalette, useTheme } from '../../theme/theme';
import { MiniBar, StripeBar } from '../../ui/Bars';
import { TipCard } from '../../ui/Bramble';
import { IconButton, LinkButton, PxButton } from '../../ui/Buttons';
import { Dashed, Frame, Plank, PressFrame } from '../../ui/Frame';
import { Rows, SectionTitle } from '../../ui/Layout';
import { TabScreen } from '../../ui/Screen';
import { Icon, Sprite, Tile } from '../../ui/Sprite';
import { Label, Txt } from '../../ui/Txt';

export default function HomeScreen() {
  const { night, now } = useTheme();
  const c = usePalette();
  const data = useData();
  const { prefs, setPrefs } = usePrefs();
  const { fmt, hidden, currency } = useMoney();

  const worth = worthOf(data.accounts, data.liabilities);
  const change = changeSince(worth, data.snapshot);
  const stats = monthStats(data.monthEntries, data.categories, now, now);
  const miles = milesSummary(data.programs);
  const owed = liabilitySummary(data.liabilities, now);
  const due = nextDue(data.liabilities, now);
  const soon = upcoming(data.liabilities, data.programs, now).slice(0, 5);
  const hasAnything = data.accounts.length + data.programs.length + data.liabilities.length + data.monthEntries.length > 0;
  const tip = homeTip({ now, currency: currency.code, hidden, stats, liabilities: data.liabilities, hasAnything });
  const sinceDate = data.snapshot?.takenAt ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const monthName = MONTHS[now.getMonth()];

  return (
    <TabScreen
      scene={(w) => (night ? <HomeNightScene width={w} /> : <HomeDayScene width={w} />)}
      kicker={formatHeaderDate(now)}
      title={greeting(now)}
      actions={
        <>
          <IconButton
            icon={hidden ? 'iEyeOff' : 'iEye'}
            label={hidden ? 'Show amounts' : 'Hide amounts'}
            active={hidden}
            onPress={() => setPrefs({ hideAmounts: !prefs.hideAmounts })}
          />
          <IconButton icon="iGear" label="Settings" onPress={() => router.push('/settings')} />
        </>
      }
      fab={{ label: 'Add an entry', onPress: () => router.push('/entry') }}
    >
      <Plank
        innerStyle={{ padding: 19, gap: 12 }}
        deco={<PlankGrass night={night} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Label color={c.woodLabel}>Net worth</Label>
          <View style={{ backgroundColor: c.woodLabel, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Txt size={11} lh={15} weight="bold" color="#3B2A20">
              {currency.code}
            </Txt>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <Txt size={38} lh={44} weight="bold" color={c.woodNum} shadow={c.night ? '#0E0B09' : '#3B2A20'} shadowSize={3} adjustsFontSizeToFit numberOfLines={1}>
            {fmt(worth.net)}
          </Txt>
          {change !== null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={change < 0 ? { transform: [{ rotate: '180deg' }] } : null}>
                <Icon name="iUp" size={18} color={change < 0 ? '#F4B678' : c.woodGood} />
              </View>
              <Txt weight="bold" color={change < 0 ? '#F4B678' : c.woodGood}>
                {`${fmt(change, { sign: 'always', dots: 4 })}  since ${formatShortDate(sinceDate)}`}
              </Txt>
            </View>
          ) : null}
        </View>
        <Dashed color={c.woodDash} dash={6} gap={6} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt size={13} color={c.woodLabel}>
              Assets
            </Txt>
            <Txt size={18} weight="bold" color={c.woodValue} numberOfLines={1} adjustsFontSizeToFit>
              {fmt(worth.assets)}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt size={13} color={c.woodLabel}>
              Liabilities
            </Txt>
            <Txt size={18} weight="bold" color={c.woodValue} numberOfLines={1} adjustsFontSizeToFit>
              {fmt(worth.owed)}
            </Txt>
          </View>
        </View>
      </Plank>

      <TipCard
        parts={tip}
        title="Bramble"
        sky={night ? '#1B2549' : '#BEE3F3'}
        ground={night ? '#233D2C' : '#6FAE52'}
        accessory={night ? 'cap' : 'cart'}
        sleepy={night}
      />

      <View style={{ gap: 18 }}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <SummaryTile
            icon="coin"
            frame={night ? '#9BD27E' : '#346B34'}
            label="Money"
            value={fmt(worth.assets)}
            sub={`${data.accounts.length} ${data.accounts.length === 1 ? 'account' : 'accounts'}`}
            onPress={() => router.push('/money')}
            deco={<Sprite name="mushroom" size={15} style={{ position: 'absolute', right: 17, top: -12 }} />}
          />
          <SummaryTile
            icon="plane"
            frame={night ? '#8FC0EA' : '#2F6FA8'}
            label="Miles"
            value={formatCount(miles.total)}
            sub={`${miles.programs} ${miles.programs === 1 ? 'program' : 'programs'}`}
            onPress={() => router.push('/miles')}
            deco={
              <AnimView name="pxHop" dur={1100} style={{ position: 'absolute', right: 21, top: -12 }}>
                <Sprite name="bird" size={18} />
              </AnimView>
            }
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <SummaryTile
            icon="receipt"
            frame={night ? '#FFD66B' : '#8A5F0E'}
            label={`Spent in ${MONTHS_SHORT[now.getMonth()]}`}
            value={fmt(stats.spent)}
            sub={stats.budget > 0 ? `of ${fmt(stats.budget, { trimZero: true, dots: 4 })}` : 'No budget set'}
            bar={stats.budget > 0 ? stats.pct : undefined}
            onPress={() => router.push('/expenses')}
            deco={<Sprite name="leafSprig" size={15} style={{ position: 'absolute', left: 73, top: -12 }} />}
          />
          <SummaryTile
            icon="scroll"
            frame={night ? '#F0A07A' : '#A0401F'}
            label="Liabilities"
            value={fmt(owed.total)}
            sub={due && due.dueDate ? `Next due ${formatShortDate(due.dueDate)}` : 'Nothing due'}
            onPress={() => router.push('/liabilities')}
            deco={
              <AnimView name="pxDrift" dur={16000} dir="alternate" unit={3} style={{ position: 'absolute', left: 69, top: -12 }}>
                <Sprite name="cat" size={21} />
              </AnimView>
            }
          />
        </View>
      </View>

      <View style={{ gap: 14 }}>
        <SectionTitle title={`${monthName} budget`} right={<LinkButton label="See all ›" onPress={() => router.push('/expenses')} />} />
        {stats.budget > 0 ? (
          <Frame innerStyle={{ padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexShrink: 1 }}>
                <Txt size={24} lh={30} weight="bold" color={stats.left < 0 ? c.warnStrong : c.ink}>
                  {fmt(Math.abs(stats.left))}
                </Txt>
                <Txt muted>{stats.left < 0 ? 'over' : 'left'}</Txt>
              </View>
              <Txt size={14} weight="bold" muted>
                {`${stats.pct}% used`}
              </Txt>
            </View>
            <BudgetTrail pct={stats.pct} over={stats.left < 0} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Txt size={13} muted>
                {`${fmt(stats.spent, { dots: 4 })} spent`}
              </Txt>
              <Txt size={13} muted>
                {stats.daysLeft > 0 ? `${fmt(stats.perDay, { dots: 2 })}/day · ${stats.daysLeft} ${stats.daysLeft === 1 ? 'day' : 'days'} left` : ''}
              </Txt>
            </View>
          </Frame>
        ) : (
          <Frame innerStyle={{ padding: 16, gap: 12 }}>
            <Txt lh={21}>Give each spending pouch a monthly budget and Bramble will track your daily allowance.</Txt>
            <PxButton label="Set budgets" icon="iEdit" onPress={() => router.push('/budgets')} />
          </Frame>
        )}
      </View>

      <View style={{ gap: 14 }}>
        <SectionTitle title="Coming up" />
        {soon.length > 0 ? (
          <Rows>
            {soon.map((item) => (
              <UpcomingRow key={item.key} item={item} />
            ))}
          </Rows>
        ) : (
          <Frame innerStyle={{ padding: 16 }}>
            <Txt muted>Nothing due in the next month, and no miles about to expire.</Txt>
          </Frame>
        )}
      </View>
    </TabScreen>
  );
}

function PlankGrass({ night }: { night: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: -12, height: 15 }}>
      <Sprite name="leafSprig" size={15} style={{ position: 'absolute', left: 12, top: 0 }} />
      <Sprite name={night ? 'leafSprig' : 'mushroom'} size={15} style={{ position: 'absolute', right: 70, top: 0 }} />
      <Sprite name="leafSprig" size={15} style={{ position: 'absolute', right: 20, top: 0 }} />
    </View>
  );
}

type SummaryTileProps = {
  icon: string;
  frame: string;
  label: string;
  value: string;
  sub: string;
  bar?: number;
  onPress: () => void;
  deco?: ReactNode;
};

function SummaryTile({ icon, frame, label, value, sub, bar, onPress, deco }: SummaryTileProps) {
  const c = usePalette();
  return (
    <PressFrame
      style={{ flex: 1 }}
      fill
      onPress={onPress}
      accessibilityLabel={`${label}: ${value}. ${sub}`}
      innerStyle={{ padding: 13, gap: 10, minHeight: 150 }}
      deco={deco}
    >
      <Tile icon={icon} frame={frame} tint={iconTint(icon)} />
      <View style={{ gap: 3 }}>
        <Txt size={14} muted>
          {label}
        </Txt>
        <Txt size={18} lh={23} weight="bold" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Txt>
        {bar !== undefined ? <MiniBar pct={bar} color={bar > 100 ? c.barWarn : c.barGold} style={{ marginVertical: 3 }} /> : null}
        <Txt size={13} muted numberOfLines={1}>
          {sub}
        </Txt>
      </View>
    </PressFrame>
  );
}

function iconTint(icon: string): 'green' | 'blue' | 'gold' | 'orange' {
  if (icon === 'coin') return 'green';
  if (icon === 'plane') return 'blue';
  if (icon === 'receipt') return 'gold';
  return 'orange';
}

/** The budget bar with Bramble's little cousin trotting towards the flag. */
function BudgetTrail({ pct, over }: { pct: number; over: boolean }) {
  const c = usePalette();
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <StripeBar
      pct={clamped}
      light={over ? c.barWarn : c.barGood}
      dark={over ? c.barWarnDark : c.barGoodDark}
      hi={over ? undefined : c.barGoodHi}
      style={{ marginTop: 24, marginRight: 6 }}
    >
      <AnimView
        name="pxHop"
        dur={700}
        pointerEvents="none"
        style={{ position: 'absolute', top: -24, left: `${clamped}%` as DimensionValue, marginLeft: -11 }}
      >
        <Sprite name="hedgehogSmall" size={21} />
      </AnimView>
      <Sprite name="flagRed" size={15} style={{ position: 'absolute', right: -10, top: -27 }} />
    </StripeBar>
  );
}

function UpcomingRow({ item }: { item: UpcomingItem }) {
  const { fmt, hidden } = useMoney();
  if (item.kind === 'due') {
    const l = item.liability;
    const title = l.kind === 'loan' ? `${l.name} instalment` : l.kind === 'card' ? `${l.name} payment` : l.name;
    const sub = l.kind === 'loan' && l.repeatsMonthly ? `${formatShortDate(item.date)} · monthly` : `Due ${formatShortDate(item.date)} · ${inDaysText(item.days)}`;
    return (
      <Pressable onPress={() => router.push({ pathname: '/liability/[id]', params: { id: l.id } })} accessibilityRole="button">
        {({ pressed }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.6 : 1 }}>
            <Tile icon={l.icon} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={16} weight="bold" numberOfLines={1}>
                {title}
              </Txt>
              <Txt size={13} muted>
                {sub}
              </Txt>
            </View>
            <Txt size={16} weight="bold">
              {fmt(item.amount)}
            </Txt>
          </View>
        )}
      </Pressable>
    );
  }
  const p = item.program;
  return (
    <Pressable onPress={() => router.push({ pathname: '/program/[id]', params: { id: p.id } })} accessibilityRole="button">
      {({ pressed }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.6 : 1 }}>
          <Tile icon="hourglass" />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={16} weight="bold" numberOfLines={1}>
              {`${p.name} ${p.kind === 'airline' ? 'miles' : 'points'} expiring`}
            </Txt>
            <Txt size={13} muted>
              {formatLongDate(item.date)}
            </Txt>
          </View>
          <Txt size={16} weight="bold">
            {`${formatCount(item.count, { hidden })} ${p.kind === 'airline' ? 'mi' : 'pts'}`}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}
