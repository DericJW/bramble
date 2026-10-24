import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { History } from '../../components/History';
import { countedLabel } from '../../data/calc';
import { useData } from '../../data/DataProvider';
import { useMoney } from '../../data/hooks';
import { createAccount, removeItem, updateAccount } from '../../data/repo';
import type { Account, AccountKind } from '../../data/types';
import { parseMoneyInput } from '../../lib/money';
import { ACCOUNT_ICONS } from '../../sprites';
import { useTheme } from '../../theme/theme';
import { IconButton, PxButton } from '../../ui/Buttons';
import { Frame } from '../../ui/Frame';
import { Field, IconChoice, Segmented } from '../../ui/Inputs';
import { useDialog, useToast } from '../../ui/Overlays';
import { LoadingScreen, SubScreen } from '../../ui/Screen';
import { Tile } from '../../ui/Sprite';
import { Label, Txt } from '../../ui/Txt';

const KINDS: { value: AccountKind; label: string }[] = [
  { value: 'bank', label: 'Bank' },
  { value: 'investment', label: 'Invest' },
  { value: 'cash', label: 'Cash' },
];

const DEFAULT_ICON: Record<AccountKind, string> = { bank: 'bank', investment: 'sprout', cash: 'pouch' };

export default function AccountScreen() {
  const { id } = useLocalSearchParams() as { id?: string };
  const data = useData();
  const isNew = !id || id === 'new';
  const account = isNew ? null : (data.accounts.find((a) => a.id === id) ?? null);
  if (!isNew && !account) {
    return data.ready ? <Gone /> : <LoadingScreen />;
  }
  return <AccountForm key={id ?? 'new'} account={account} />;
}

function Gone() {
  return (
    <SubScreen title="Account">
      <Frame innerStyle={{ padding: 16 }}>
        <Txt>This account has been removed.</Txt>
      </Frame>
    </SubScreen>
  );
}

function AccountForm({ account }: { account: Account | null }) {
  const data = useData();
  const { now } = useTheme();
  const { fmt, currency } = useMoney();
  const dialog = useDialog();
  const toast = useToast();
  const [name, setName] = useState(account?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'bank');
  const [icon, setIcon] = useState(account?.icon ?? 'bank');
  const [opening, setOpening] = useState('');
  const openingCents = parseMoneyInput(opening);

  const valid = name.trim().length > 0 && (account !== null || opening.trim() === '' || openingCents !== null);

  const changeKind = (k: AccountKind) => {
    if (icon === DEFAULT_ICON[kind]) setIcon(DEFAULT_ICON[k]);
    setKind(k);
  };

  const save = () => {
    if (!valid || !data.uid) return;
    const input = { name: name.trim(), kind, icon };
    const job = account ? updateAccount(data.uid, account.id, input) : createAccount(data.uid, input, openingCents ?? 0, data.accounts);
    job.catch(() => toast.show('Couldn’t save the account. Check your connection.', 'warn'));
    router.back();
  };

  const remove = async () => {
    if (!account || !data.uid) return;
    const ok = await dialog.confirm({
      title: `Remove ${account.name}?`,
      message: 'Its balance stops counting towards your money. Entries that mention it stay in your history.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    removeItem(data.uid, 'accounts', account.id).catch(() => toast.show('Couldn’t remove it. Check your connection.', 'warn'));
    router.back();
  };

  return (
    <SubScreen
      title={account ? account.name : 'New account'}
      right={account ? <IconButton icon="iTrash" label="Remove account" onPress={remove} /> : undefined}
      footer={<PxButton label={account ? 'Save changes' : 'Add account'} icon="iCheck" height={52} disabled={!valid} onPress={save} />}
    >
      {account ? (
        <Frame innerStyle={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Tile icon={account.icon} />
            <View style={{ flex: 1, gap: 2 }}>
              <Label size={12}>Balance</Label>
              <Txt size={28} lh={34} weight="bold" numberOfLines={1} adjustsFontSizeToFit>
                {fmt(account.balance)}
              </Txt>
              <Txt size={13} muted>
                {countedLabel(account, now)}
              </Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PxButton
              label="Update balance"
              size={15}
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/entry', params: { type: 'balance', account: account.id } })}
            />
            <PxButton
              label="Log expense"
              kind="secondary"
              size={15}
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/entry', params: { type: 'expense' } })}
            />
          </View>
        </Frame>
      ) : null}

      <Frame innerStyle={{ padding: 16, gap: 16 }}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Main savings" maxLength={40} autoCapitalize="words" />
        <View style={{ gap: 6 }}>
          <Label>Type</Label>
          <Segmented options={KINDS} value={kind} onChange={changeKind} />
        </View>
        <View style={{ gap: 8 }}>
          <Label>Picture</Label>
          <IconChoice icons={ACCOUNT_ICONS} value={icon} onChange={setIcon} />
        </View>
        {account ? null : (
          <Field
            label="Balance today"
            value={opening}
            onChangeText={setOpening}
            placeholder="0.00"
            keyboardType="decimal-pad"
            prefix={currency.symbol}
            hint="What's in it right now. You can recount any time."
            error={opening.trim() !== '' && openingCents === null ? 'That doesn’t look like an amount.' : null}
          />
        )}
      </Frame>

      {account ? <History refId={account.id} empty="No counts or spending from this account yet." /> : null}
    </SubScreen>
  );
}
