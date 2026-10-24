import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Jar } from '../../components/Jar';
import { countedLabel, groupAccounts, isCountDue, moneyTip, shareLabel, sumBalances } from '../../data/calc';
import { useData } from '../../data/DataProvider';
import { useMoney } from '../../data/hooks';
import type { Account } from '../../data/types';
import MoneyScene from '../../scenes/MoneyScene';
import { usePalette, useTheme } from '../../theme/theme';
import { TipCard } from '../../ui/Bramble';
import { IconButton, PxButton } from '../../ui/Buttons';
import { Frame } from '../../ui/Frame';
import { Badge, Empty, Rows, SectionTitle } from '../../ui/Layout';
import { TabScreen } from '../../ui/Screen';
import { Icon, Sprite, Tile } from '../../ui/Sprite';
import { Txt } from '../../ui/Txt';

export default function MoneyScreen() {
  const { tone, night, now } = useTheme();
  const c = usePalette();
  const data = useData();
  const { fmt } = useMoney();
  const groups = groupAccounts(data.accounts);
  const total = sumBalances(data.accounts);
  const tip = moneyTip(data.accounts, now, data.settings.countEveryDays);
  const addAccount = () => router.push({ pathname: '/account/[id]', params: { id: 'new' } });

  return (
    <TabScreen
      scene={(w) => <MoneyScene width={w} tone={tone} />}
      kicker="Harvest store"
      title="Money"
      actions={<IconButton icon="iPlus" label="Add account" onPress={addAccount} />}
    >
      <Frame innerStyle={{ paddingHorizontal: 18, paddingTop: 20, paddingBottom: 18, gap: 16 }} deco={<WheatStrip />}>
        <View style={{ gap: 4 }}>
          <Txt size={14} muted>
            Total across accounts
          </Txt>
          <Txt size={34} lh={40} weight="bold" color={c.good} numberOfLines={1} adjustsFontSizeToFit>
            {fmt(total)}
          </Txt>
          <Txt size={13} muted>
            {`${data.accounts.length} ${data.accounts.length === 1 ? 'account' : 'accounts'} · counted by you`}
          </Txt>
        </View>
        <View style={{ backgroundColor: c.cardInset, paddingTop: 12, paddingHorizontal: 6 }}>
          <View style={{ flexDirection: 'row' }}>
            {groups.map((g) => (
              <View key={g.kind} style={{ flex: 1, alignItems: 'center', gap: 6, paddingBottom: 12 }}>
                <Jar share={g.share} sprout={g.kind === 'investment'} night={night} />
                <Txt size={14} weight="bold">
                  {g.jar}
                </Txt>
                <Txt size={13} muted>
                  {shareLabel(g.share)}
                </Txt>
              </View>
            ))}
          </View>
          <View style={{ height: 6, backgroundColor: '#A86E3E', marginHorizontal: -6 }} />
          <View style={{ height: 3, backgroundColor: '#7A4A2A', marginHorizontal: -6 }} />
        </View>
      </Frame>

      <TipCard
        parts={tip}
        sky={night ? '#1B2549' : '#F7EBC6'}
        ground={night ? '#3A3420' : '#E3C15A'}
        accessory={night ? 'cap' : 'coin'}
        sleepy={night}
      />

      {data.accounts.length > 0 ? (
        <View style={{ gap: 10 }}>
          <PxButton
            label="Update balances"
            lead={<Sprite name="pencil" size={24} />}
            height={54}
            size={17}
            onPress={() => router.push('/recount')}
          />
          <Txt size={13} muted center>
            Walks you through each jar to key in today’s count
          </Txt>
        </View>
      ) : (
        <Empty
          icon="chest"
          title="No jars on the shelf yet"
          body="Add your bank accounts, investments and cash. You key in the balances yourself, so nothing is linked to your bank."
          action={<PxButton label="Add an account" icon="iPlus" onPress={addAccount} style={{ alignSelf: 'stretch' }} />}
        />
      )}

      {groups
        .filter((g) => g.accounts.length > 0)
        .map((g) => (
          <View key={g.kind} style={{ gap: 14 }}>
            <SectionTitle
              title={g.title}
              right={
                <Txt size={15} weight="bold" muted>
                  {fmt(g.total)}
                </Txt>
              }
            />
            <Rows>
              {g.accounts.map((a) => (
                <AccountRow key={a.id} account={a} due={isCountDue(a, now, data.settings.countEveryDays)} />
              ))}
            </Rows>
          </View>
        ))}
    </TabScreen>
  );
}

function AccountRow({ account, due }: { account: Account; due: boolean }) {
  const c = usePalette();
  const { now } = useTheme();
  const { fmt } = useMoney();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/account/[id]', params: { id: account.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, ${fmt(account.balance)}${due ? ', count due' : ''}`}
    >
      {({ pressed }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.6 : 1 }}>
          <Tile icon={account.icon} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Txt size={16} weight="bold" numberOfLines={1}>
              {account.name}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Txt size={13} muted>
                {countedLabel(account, now).replace('Counted ', due ? '' : 'Counted ')}
              </Txt>
              {due ? <Badge text="Count due" color={c.warnStrong} bg={c.warnBg} edge={c.warnEdge} /> : null}
            </View>
          </View>
          <Txt size={16} weight="bold">
            {fmt(account.balance)}
          </Txt>
          <Icon name="iChevRight" size={16} color={c.faint} />
        </View>
      )}
    </Pressable>
  );
}

/** Ears of wheat poking up behind the total card. */
function WheatStrip() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: -12, height: 15, flexDirection: 'row', justifyContent: 'space-around' }}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={{ width: 6, height: 15, alignItems: 'center', marginTop: i % 2 ? 3 : 0 }}>
          <View style={{ width: 3, height: 3, backgroundColor: '#F4D77A' }} />
          <View style={{ width: 3, height: 9, backgroundColor: '#D4AB45' }} />
        </View>
      ))}
    </View>
  );
}
