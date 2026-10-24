import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { countedLabel } from '../data/calc';
import { useData } from '../data/DataProvider';
import { useMoney } from '../data/hooks';
import { saveEntry } from '../data/repo';
import type { Account } from '../data/types';
import { atNoon } from '../lib/dates';
import { haptic } from '../lib/haptics';
import { digitsToCents, displayDigits, pressKey } from '../lib/money';
import { usePrefs } from '../theme/prefs';
import { usePalette, useTheme } from '../theme/theme';
import { Bramble } from '../ui/Bramble';
import { PxButton } from '../ui/Buttons';
import { Frame } from '../ui/Frame';
import { Keypad } from '../ui/Keypad';
import { Rows } from '../ui/Layout';
import { useToast } from '../ui/Overlays';
import { SubScreen } from '../ui/Screen';
import { Tile } from '../ui/Sprite';
import { Label, Txt } from '../ui/Txt';

type Result = { account: Account; before: number; after: number };

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export default function RecountScreen() {
  const data = useData();
  const c = usePalette();
  const { now } = useTheme();
  const { prefs } = usePrefs();
  const { fmt, currency } = useMoney();
  const toast = useToast();
  // Fix the list when the walk-through starts, so it doesn't shift as balances change.
  const [accounts] = useState<Account[]>(() => [...data.accounts]);
  const [index, setIndex] = useState(0);
  const [digits, setDigits] = useState('');
  const [results, setResults] = useState<Result[]>([]);

  const current = accounts[index] ?? null;
  const live = current ? (data.accounts.find((a) => a.id === current.id) ?? current) : null;
  const done = index >= accounts.length;

  const record = (after: number | null) => {
    if (!live || !data.uid) return;
    const amount = after ?? live.balance;
    saveEntry(
      data.uid,
      data.effectState,
      {
        type: 'balance',
        date: atNoon(new Date()),
        note: after === null ? 'Counted, no change' : '',
        accountId: live.id,
        amount,
        prevBalance: live.balance,
        prevCountedAt: live.lastCountedAt,
      },
      null,
    ).catch(() => toast.show('Couldn’t save that count. Check your connection.', 'warn'));
    if (prefs.haptics) haptic('tap');
    setResults((r) => [...r, { account: live, before: live.balance, after: amount }]);
    setDigits('');
    setIndex((i) => i + 1);
  };

  const changed = useMemo(() => results.filter((r) => r.after !== r.before), [results]);

  if (accounts.length === 0) {
    return (
      <SubScreen title="Update balances" closeKind="close">
        <Frame innerStyle={{ padding: 16, gap: 12 }}>
          <Txt>No accounts to count yet.</Txt>
          <PxButton label="Add an account" onPress={() => router.replace({ pathname: '/account/[id]', params: { id: 'new' } })} />
        </Frame>
      </SubScreen>
    );
  }

  if (done) {
    const net = results.reduce((t, r) => t + (r.after - r.before), 0);
    return (
      <SubScreen title="All counted!" closeKind="close" footer={<PxButton label="Done" icon="iCheck" height={52} onPress={() => router.back()} />}>
        <Frame inset={c.cardInset} innerStyle={{ padding: 14, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <Bramble size={64} accessory="coin" />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt size={13} weight="bold" upper tracking={0.5} color={c.good}>
              Bramble
            </Txt>
            <Txt lh={21}>
              {changed.length === 0
                ? 'Every jar matched last time. Tidy shelves!'
                : `${changed.length} ${changed.length === 1 ? 'jar' : 'jars'} changed, ${fmt(net, { sign: 'always' })} in total.`}
            </Txt>
          </View>
        </Frame>
        {changed.length > 0 ? (
          <Rows>
            {changed.map((r) => (
              <View key={r.account.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                <Tile icon={r.account.icon} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt size={16} weight="bold" numberOfLines={1}>
                    {r.account.name}
                  </Txt>
                  <Txt size={13} muted>{`now ${fmt(r.after)}`}</Txt>
                </View>
                <Txt size={16} weight="bold" color={r.after >= r.before ? c.good : c.warnStrong}>
                  {fmt(r.after - r.before, { sign: 'always' })}
                </Txt>
              </View>
            ))}
          </Rows>
        ) : null}
      </SubScreen>
    );
  }

  const typed = digits !== '';
  const cents = digitsToCents(digits);
  return (
    <SubScreen
      title="Update balances"
      closeKind="close"
      compact
      footer={
        <View style={{ gap: 12 }}>
          <Keypad onKey={(k) => setDigits((d) => pressKey(d, k, { allowDecimal: currency.decimals === 2 }))} allowDecimal={currency.decimals === 2} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PxButton label="Same as before" kind="secondary" size={15} style={{ flex: 1 }} onPress={() => record(null)} />
            <PxButton label={index === accounts.length - 1 ? 'Save & finish' : 'Save & next'} size={15} style={{ flex: 1 }} disabled={!typed} onPress={() => record(cents)} />
          </View>
        </View>
      }
    >
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }} accessibilityLabel={`Account ${index + 1} of ${accounts.length}`}>
        {accounts.map((a, i) => (
          <View key={a.id} style={{ width: 18, height: 8, backgroundColor: i < index ? c.btn : i === index ? c.gold : c.track, borderWidth: 2, borderColor: c.border }} />
        ))}
      </View>
      {live ? (
        <Frame inset={c.cardInset} innerStyle={{ padding: 14, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Tile icon={live.icon} size={52} />
            <View style={{ flex: 1, gap: 2 }}>
              <Label size={12}>{`Jar ${index + 1} of ${accounts.length}`}</Label>
              <Txt size={18} weight="bold" numberOfLines={1}>
                {live.name}
              </Txt>
              <Txt size={13} muted>{`${fmt(live.balance)} · ${lowerFirst(countedLabel(live, now))}`}</Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Txt size={22} weight="bold" muted>
              {currency.symbol}
            </Txt>
            <Txt size={40} lh={46} weight="bold" color={typed ? c.ink : c.faint} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1 }}>
              {typed ? displayDigits(digits) : 'Today’s count'}
            </Txt>
          </View>
          {typed ? (
            <Txt size={14} weight="bold" color={cents - live.balance >= 0 ? c.good : c.warnStrong}>
              {cents === live.balance ? 'Same as last time' : `${fmt(cents - live.balance, { sign: 'always' })} since last count`}
            </Txt>
          ) : (
            <Txt size={13} muted>
              Check your banking app or wallet and key in what’s there now.
            </Txt>
          )}
        </Frame>
      ) : null}
    </SubScreen>
  );
}
