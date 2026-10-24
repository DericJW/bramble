import { router } from 'expo-router';
import { Pressable, View, type DimensionValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { markPaidDraft } from '../../data/actions';
import { dueAmountOf, LIABILITY_KINDS, liabilitySummary, loanProgress, shareLabel } from '../../data/calc';
import { useData } from '../../data/DataProvider';
import { useMoney } from '../../data/hooks';
import { saveEntry } from '../../data/repo';
import type { Liability } from '../../data/types';
import { addMonths, daysBetween, dueText, formatShortDate, formatShortMonthYear, formatWeekdayDate } from '../../lib/dates';
import { AnimView, useFlip } from '../../scenes/Anim';
import LiabilitiesScene from '../../scenes/LiabilitiesScene';
import { usePrefs } from '../../theme/prefs';
import { usePalette, useTheme } from '../../theme/theme';
import { SegmentBar } from '../../ui/Bars';
import { IconButton, PxButton } from '../../ui/Buttons';
import { Frame } from '../../ui/Frame';
import { Empty, Rows, SectionTitle } from '../../ui/Layout';
import { useDialog, useToast } from '../../ui/Overlays';
import { TabScreen } from '../../ui/Screen';
import { Sprite, Tile } from '../../ui/Sprite';
import { Txt } from '../../ui/Txt';
import { haptic } from '../../lib/haptics';

const SECTION_ORDER = ['card', 'loan', 'personal'] as const;

export default function LiabilitiesScreen() {
  const { tone, now } = useTheme();
  const c = usePalette();
  const data = useData();
  const { fmt } = useMoney();
  const summary = liabilitySummary(data.liabilities, now);
  const soon = summary.dueSoon[0] ?? null;
  const addLiability = () => router.push({ pathname: '/liability/[id]', params: { id: 'new' } });

  return (
    <TabScreen
      scene={(w) => <LiabilitiesScene width={w} tone={tone} />}
      kicker="Settling up"
      title="Liabilities"
      light
      actions={<IconButton icon="iPlus" label="Add liability" dusk onPress={addLiability} />}
      fab={data.liabilities.length > 0 ? { label: 'Log a payment or charge', onPress: () => router.push({ pathname: '/entry', params: { type: 'liability' } }) } : null}
    >
      <Frame innerStyle={{ paddingHorizontal: 18, paddingTop: 20, paddingBottom: 18, gap: 16 }} deco={<FireflyJar />}>
        <View style={{ gap: 4 }}>
          <Txt size={14} muted>
            Total owed
          </Txt>
          <Txt size={34} lh={40} weight="bold" color={c.warnStrong} numberOfLines={1} adjustsFontSizeToFit>
            {fmt(summary.total)}
          </Txt>
          <Txt size={13} weight="bold" color={summary.dueSoonTotal > 0 ? c.warnStrong : c.muted}>
            {summary.dueSoonTotal > 0 ? `${fmt(summary.dueSoonTotal)} due in the next 30 days` : 'Nothing due in the next 30 days'}
          </Txt>
        </View>
        <SegmentBar segments={summary.byKind.map((k) => ({ key: k.kind, weight: k.total, color: k.color, hi: k.hi }))} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 8 }}>
          {summary.byKind
            .filter((k) => k.total > 0)
            .map((k) => (
              <View key={k.kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 13, height: 13, borderWidth: 2, borderColor: c.border, backgroundColor: k.color }} />
                <Txt size={13} muted>{`${k.legend} ${shareLabel(k.share)}`}</Txt>
              </View>
            ))}
        </View>
      </Frame>

      {soon ? <DueSoonCard liability={soon} /> : null}

      {data.liabilities.length === 0 ? (
        <Empty
          icon="scroll"
          title="Nothing owed. Lovely!"
          body="Add credit cards, loans or money you owe a friend to keep an eye on them and their due dates."
          action={<PxButton label="Add a liability" icon="iPlus" onPress={addLiability} style={{ alignSelf: 'stretch' }} />}
        />
      ) : null}

      {SECTION_ORDER.map((kind) => LIABILITY_KINDS.find((k) => k.kind === kind)!).map((k) => {
        const list = data.liabilities.filter((l) => l.kind === k.kind);
        if (list.length === 0) return null;
        const total = list.reduce((t, l) => t + l.balance, 0);
        return (
          <View key={k.kind} style={{ gap: 14 }}>
            <SectionTitle
              title={k.title}
              right={
                <Txt size={15} weight="bold" muted>
                  {fmt(total)}
                </Txt>
              }
            />
            <Rows>
              {list.map((l) => (
                <LiabilityRow key={l.id} liability={l} now={now} />
              ))}
            </Rows>
          </View>
        );
      })}
    </TabScreen>
  );
}

function DueSoonCard({ liability }: { liability: Liability }) {
  const c = usePalette();
  const { now } = useTheme();
  const { fmt } = useMoney();
  const data = useData();
  const dialog = useDialog();
  const toast = useToast();
  const { prefs } = usePrefs();
  const days = daysBetween(now, liability.dueDate as Date);
  const amount = dueAmountOf(liability);
  const from = data.accounts.find((a) => a.id === liability.payFromAccountId) ?? null;

  const markPaid = async () => {
    const nextDate = liability.repeatsMonthly && liability.dueDate ? formatShortDate(addMonths(liability.dueDate, 1)) : null;
    const ok = await dialog.confirm({
      title: `Mark ${liability.name} as paid?`,
      message:
        `This logs a payment of ${fmt(amount)}${from ? ` from ${from.name}` : ''}` +
        (nextDate ? ` and moves the due date to ${nextDate}.` : '.'),
      confirmLabel: 'Mark as paid',
    });
    if (!ok || !data.uid) return;
    saveEntry(data.uid, data.effectState, markPaidDraft(liability, now), null).catch(() => toast.show('Couldn’t save that payment. Check your connection.', 'warn'));
    if (prefs.haptics) haptic('success');
    toast.show(`${liability.name} marked as paid`);
  };

  return (
    <Frame border={c.warn} inset={c.warnBg} innerStyle={{ padding: 13, gap: 14 }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.warn, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Sprite name="hourglass" size={18} />
          <Txt size={12} lh={16} weight="bold" upper tracking={0.4} color="#FFF8E6">
            {dueText(days)}
          </Txt>
        </View>
      </View>
      <Pressable
        onPress={() => router.push({ pathname: '/liability/[id]', params: { id: liability.id } })}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <Tile icon={liability.icon} size={50} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt size={17} weight="bold" numberOfLines={1}>
            {liability.name}
          </Txt>
          <Txt size={13} muted>
            {`${liability.kind === 'card' ? 'Statement due' : 'Due'} ${formatWeekdayDate(liability.dueDate as Date)}`}
          </Txt>
        </View>
        <Txt size={18} weight="bold">
          {fmt(amount)}
        </Txt>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <PxButton label="Mark as paid" onPress={markPaid} style={{ flex: 1 }} size={15} />
        <PxButton
          label="Log a payment"
          kind="secondary"
          size={15}
          onPress={() => router.push({ pathname: '/entry', params: { type: 'liability', liability: liability.id } })}
          style={{ flex: 1 }}
        />
      </View>
    </Frame>
  );
}

function LiabilityRow({ liability: l, now }: { liability: Liability; now: Date }) {
  const { fmt } = useMoney();
  const loan = loanProgress(l);
  let sub: string;
  if (l.kind === 'loan' && l.dueAmount) {
    sub = `${fmt(l.dueAmount, { trimZero: true, dots: 3 })}/mo${l.dueDate ? ` · next ${formatShortDate(l.dueDate)}` : ''}`;
  } else if (l.dueDate) {
    const days = daysBetween(now, l.dueDate);
    sub = days < 0 ? `Overdue since ${formatShortDate(l.dueDate)}` : `Due ${formatShortDate(l.dueDate)}`;
  } else {
    sub = l.note ? `${l.note} · no due date` : 'No due date';
  }
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/liability/[id]', params: { id: l.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${l.name}, ${fmt(l.balance)}, ${sub}`}
    >
      {({ pressed }) => (
        <View style={{ paddingVertical: loan ? 14 : 12, gap: 12, opacity: pressed ? 0.6 : 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Tile icon={l.icon} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Txt size={16} weight="bold" numberOfLines={1}>
                {l.name}
              </Txt>
              <Txt size={13} muted numberOfLines={1}>
                {sub}
              </Txt>
            </View>
            <Txt size={16} weight="bold">
              {fmt(l.balance)}
            </Txt>
          </View>
          {loan ? (
            <>
              <LoanTrack pct={loan.pct} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Txt size={13} muted>{`${loan.made} of ${loan.total} payments made`}</Txt>
                {loan.endDate ? <Txt size={13} muted>{`Ends ${formatShortMonthYear(loan.endDate)}`}</Txt> : null}
              </View>
            </>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

/** The road to the finish flag, with a little car as far along as the loan is paid. */
function LoanTrack({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <Frame drop={null} style={{ marginTop: 16, marginRight: 10 }} innerStyle={{ height: 15, backgroundColor: '#5E5872' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 6, height: 3, flexDirection: 'row', overflow: 'hidden' }}>
        {Array.from({ length: 30 }, (_, i) => (
          <View key={i} style={{ width: 6, marginLeft: 9, backgroundColor: '#C9C2D6' }} />
        ))}
      </View>
      <View style={{ width: `${clamped}%` as DimensionValue, height: '100%', backgroundColor: '#8C849E', borderTopWidth: 3, borderTopColor: '#A69EB8' }} />
      <AnimView name="pxHop" dur={600} pointerEvents="none" style={{ position: 'absolute', top: -12, left: `${clamped}%` as DimensionValue, marginLeft: -12 }}>
        <Sprite name="carSide" size={21} />
      </AnimView>
      <Sprite name="flagChecker" size={15} style={{ position: 'absolute', right: -12, top: -24 }} />
    </Frame>
  );
}

/** A jar of fireflies sitting on the total card. */
function FireflyJar() {
  const flip = useFlip(900);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', right: 27, top: -30 }}>
      <Svg width={24} height={30} viewBox="0 0 8 10">
        <Path fill="#8E5A35" d="M1 0h6v1H1z" />
        <Path fill="#5A3420" d="M1 1h6v1H1z M0 2h8v8H0z" />
        <Path fill="#F3F0D8" d="M1 3h6v6H1z" />
        <Path fill="#FFFFFF" d="M1 3h1v3H1z" />
        <Path fill="#E8B23A" d={flip ? 'M4 4h1v1H4z M2 6h1v1H2z M5 8h1v1H5z' : 'M3 4h1v1H3z M5 6h1v1H5z M3 7h1v1H3z'} />
      </Svg>
    </View>
  );
}
