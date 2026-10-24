import { router } from 'expo-router';
import { View } from 'react-native';

import { EntryRow } from '../../components/EntryRow';
import { GoalPath } from '../../components/GoalPath';
import { goalProgress, milesSummary, milesValue, unitOf } from '../../data/calc';
import { useData } from '../../data/DataProvider';
import type { Program } from '../../data/types';
import { daysBetween, formatLongDate, formatShortDate } from '../../lib/dates';
import { formatCount } from '../../lib/money';
import { AnimView } from '../../scenes/Anim';
import MilesScene from '../../scenes/MilesScene';
import { usePalette, useTheme } from '../../theme/theme';
import { IconButton, LinkButton, PxButton } from '../../ui/Buttons';
import { Frame, PressFrame } from '../../ui/Frame';
import { Empty, Rows, SectionTitle } from '../../ui/Layout';
import { TabScreen } from '../../ui/Screen';
import { Icon, Sprite, Tile } from '../../ui/Sprite';
import { Label, Txt } from '../../ui/Txt';

const KIND_LABEL: Record<Program['kind'], string> = {
  airline: 'Airline miles',
  hotel: 'Hotel points',
  points: 'Points',
};

export default function MilesScreen() {
  const { tone, now } = useTheme();
  const c = usePalette();
  const data = useData();
  const summary = milesSummary(data.programs);
  const goal = goalProgress(data.settings.goal, data.programs);
  const log = data.milesEntries.slice(0, 12);
  const logMiles = () => router.push({ pathname: '/entry', params: { type: 'miles' } });
  const addProgram = () => router.push({ pathname: '/program/[id]', params: { id: 'new' } });

  return (
    <TabScreen
      scene={(w) => <MilesScene width={w} tone={tone} />}
      kicker="Sky log"
      title="Miles"
      actions={<IconButton icon="iPlus" label="Add program" onPress={addProgram} />}
      fab={data.programs.length > 0 ? { label: 'Log miles', onPress: logMiles } : null}
    >
      <Frame
        innerStyle={{ flexDirection: 'row' }}
        deco={
          <AnimView name="pxHop" dur={1300} style={{ position: 'absolute', right: 33, top: -12 }}>
            <Sprite name="seagull" size={18} />
          </AnimView>
        }
      >
        <View style={{ flex: 1, minWidth: 0, padding: 18, gap: 4 }}>
          <Label size={12}>Total miles</Label>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Txt size={36} lh={42} weight="bold" color={c.blue} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1 }}>
              {formatCount(summary.total)}
            </Txt>
            <Txt size={18} weight="bold" color={c.blue}>
              mi
            </Txt>
          </View>
          <Txt size={13} muted>
            {summary.fromPoints > 0 ? `Includes ≈${formatCount(summary.fromPoints)} mi from points` : 'Airline miles plus converted points'}
          </Txt>
          <Barcode />
        </View>
        <View style={{ width: 3, overflow: 'hidden' }}>
          {Array.from({ length: 20 }, (_, i) => (
            <View key={i} style={{ height: 6, marginBottom: 6, backgroundColor: c.drop }} />
          ))}
        </View>
        <View style={{ width: 92, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14, backgroundColor: c.tint.blue }}>
          <Sprite name="plane" size={46} />
          <Txt size={24} lh={28} weight="bold" color={c.blueDeep}>
            {String(summary.programs)}
          </Txt>
          <Txt size={13} color={c.blueDeep}>
            {summary.programs === 1 ? 'program' : 'programs'}
          </Txt>
        </View>
      </Frame>

      {goal ? (
        <PressFrame innerStyle={{ padding: 16, gap: 12 }} onPress={() => router.push('/goal')} accessibilityLabel={`Goal ${goal.label}, ${goal.pct} percent`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
              <Sprite name="star" size={20} />
              <Txt size={16} weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                {`Goal · ${goal.label}`}
              </Txt>
            </View>
            <Txt size={16} weight="bold" color={c.blue}>
              {`${goal.pct}%`}
            </Txt>
          </View>
          <GoalPath pct={goal.pct} tone={tone} label={`Flight path to ${goal.label}, ${goal.pct} percent of the way there`} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <Txt size={22} lh={28} weight="bold">
              {formatCount(goal.current)}
            </Txt>
            <Txt size={14} muted>
              {goal.toGo > 0
                ? `of ${formatCount(goal.target)} ${goal.programName} miles · ${formatCount(goal.toGo)} to go`
                : `of ${formatCount(goal.target)}. You made it!`}
            </Txt>
          </View>
        </PressFrame>
      ) : data.programs.length > 0 ? (
        <Frame innerStyle={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Sprite name="star" size={24} />
            <Txt weight="bold" size={16} style={{ flex: 1 }}>
              Saving up for a trip?
            </Txt>
          </View>
          <Txt muted lh={20}>
            Set a miles goal and watch the little plane fly closer as your balance grows.
          </Txt>
          <PxButton label="Set a goal" kind="secondary" onPress={() => router.push('/goal')} />
        </Frame>
      ) : null}

      <View style={{ gap: 14 }}>
        <SectionTitle title="Programs" />
        {data.programs.length === 0 ? (
          <Empty
            icon="plane"
            title="No programs yet"
            body="Add your frequent flyer and card points programs, then log miles as you earn and spend them."
            action={<PxButton label="Add a program" icon="iPlus" onPress={addProgram} style={{ alignSelf: 'stretch' }} />}
          />
        ) : (
          <View style={{ gap: 16 }}>
            {data.programs.map((p) => (
              <ProgramCard key={p.id} program={p} now={now} />
            ))}
          </View>
        )}
      </View>

      {data.programs.length > 0 ? (
        <View style={{ gap: 14 }}>
          <SectionTitle title="Flight log" right={<LinkButton label="Log miles ›" color={c.blue} onPress={logMiles} />} />
          {log.length > 0 ? (
            <Rows>
              {log.map((e) => (
                <EntryRow key={e.id} entry={e} withDate />
              ))}
            </Rows>
          ) : (
            <Frame innerStyle={{ padding: 16 }}>
              <Txt muted>Nothing logged yet. Tap + whenever you earn or redeem miles.</Txt>
            </Frame>
          )}
        </View>
      ) : null}
    </TabScreen>
  );
}

function ProgramCard({ program, now }: { program: Program; now: Date }) {
  const c = usePalette();
  const unit = unitOf(program);
  const updated = program.updatedAt ? ` · updated ${formatShortDate(program.updatedAt)}` : '';
  let strip: { bg: string; fg: string; icon: string; text: string; strong: boolean } | null = null;
  if (program.expiringAmount && program.expiringOn) {
    const days = daysBetween(now, program.expiringOn);
    strip =
      days >= 0
        ? {
            bg: c.warnBg,
            fg: c.warnStrong,
            icon: 'hourglass',
            text: `${formatCount(program.expiringAmount)} ${unit === 'mi' ? 'miles' : 'points'} expire ${formatLongDate(program.expiringOn)}`,
            strong: true,
          }
        : { bg: c.page, fg: c.muted, icon: 'hourglass', text: `Expiry date ${formatLongDate(program.expiringOn)} has passed`, strong: false };
  } else if (program.kind !== 'airline' && program.rate) {
    strip = {
      bg: c.tint.blue,
      fg: c.blueDeep,
      icon: 'iSwap',
      text: `≈ ${formatCount(milesValue(program))} mi at your rate of ${program.rate} pts per mile`,
      strong: true,
    };
  } else if (program.kind === 'airline') {
    strip = { bg: c.page, fg: c.muted, icon: 'hourglass', text: 'No expiry date added yet', strong: false };
  }
  return (
    <PressFrame
      innerStyle={{ padding: 14, gap: 12 }}
      onPress={() => router.push({ pathname: '/program/[id]', params: { id: program.id } })}
      accessibilityLabel={`${program.name}, ${formatCount(program.balance)} ${unit}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Tile icon={program.icon} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt size={16} weight="bold" numberOfLines={1}>
            {program.name}
          </Txt>
          <Txt size={13} muted numberOfLines={1}>
            {`${KIND_LABEL[program.kind]}${updated}`}
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Txt size={18} weight="bold">
            {formatCount(program.balance)}
          </Txt>
          {unit === 'pts' ? (
            <Txt size={13} weight="bold" muted>
              pts
            </Txt>
          ) : null}
        </View>
      </View>
      {strip ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: strip.bg }}>
          {strip.icon.startsWith('i') ? <Icon name={strip.icon} size={16} color={strip.fg} /> : <Sprite name={strip.icon} size={18} />}
          <Txt size={13} weight={strip.strong ? 'bold' : 'medium'} color={strip.fg} style={{ flex: 1 }}>
            {strip.text}
          </Txt>
        </View>
      ) : null}
    </PressFrame>
  );
}

/** Boarding-pass barcode doodle. */
function Barcode() {
  const c = usePalette();
  const bars = [3, 3, 6, 3, 3, 6, 3, 3, 3, 6, 3, 3, 6, 3, 3, 3, 6, 3];
  return (
    <View style={{ flexDirection: 'row', height: 15, marginTop: 8, gap: 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bars.map((w, i) => (
        <View key={i} style={{ width: w, backgroundColor: c.ink }} />
      ))}
    </View>
  );
}
