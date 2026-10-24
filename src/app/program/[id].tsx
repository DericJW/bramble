import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { History } from '../../components/History';
import { milesValue, unitOf } from '../../data/calc';
import { useData } from '../../data/DataProvider';
import { createProgram, removeItem, saveGoal, setBalance, updateProgram } from '../../data/repo';
import type { Program, ProgramKind } from '../../data/types';
import { formatLongDate } from '../../lib/dates';
import { formatCount, parseCountInput } from '../../lib/money';
import { PROGRAM_ICONS } from '../../sprites';
import { IconButton, PxButton } from '../../ui/Buttons';
import { Frame } from '../../ui/Frame';
import { Field, IconChoice, Segmented } from '../../ui/Inputs';
import { Rows, RowButton } from '../../ui/Layout';
import { useDialog, useToast } from '../../ui/Overlays';
import { DateSheet } from '../../ui/Pickers';
import { LoadingScreen, SubScreen } from '../../ui/Screen';
import { Tile } from '../../ui/Sprite';
import { Label, Txt } from '../../ui/Txt';

const KINDS: { value: ProgramKind; label: string }[] = [
  { value: 'airline', label: 'Airline' },
  { value: 'points', label: 'Card points' },
  { value: 'hotel', label: 'Hotel' },
];

const DEFAULT_ICON: Record<ProgramKind, string> = { airline: 'plane', points: 'star', hotel: 'hotel' };

export default function ProgramScreen() {
  const { id } = useLocalSearchParams() as { id?: string };
  const data = useData();
  const isNew = !id || id === 'new';
  const program = isNew ? null : (data.programs.find((p) => p.id === id) ?? null);
  if (!isNew && !program) {
    return data.ready ? (
      <SubScreen title="Program">
        <Frame innerStyle={{ padding: 16 }}>
          <Txt>This program has been removed.</Txt>
        </Frame>
      </SubScreen>
    ) : (
      <LoadingScreen />
    );
  }
  return <ProgramForm key={id ?? 'new'} program={program} />;
}

function ProgramForm({ program }: { program: Program | null }) {
  const data = useData();
  const dialog = useDialog();
  const toast = useToast();
  const [name, setName] = useState(program?.name ?? '');
  const [kind, setKind] = useState<ProgramKind>(program?.kind ?? 'airline');
  const [icon, setIcon] = useState(program?.icon ?? 'plane');
  const [balance, setBalanceText] = useState(program ? String(program.balance) : '');
  const [rate, setRate] = useState(program?.rate ? String(program.rate) : '');
  const [expAmount, setExpAmount] = useState(program?.expiringAmount ? String(program.expiringAmount) : '');
  const [expOn, setExpOn] = useState<Date | null>(program?.expiringOn ?? null);
  const [dateOpen, setDateOpen] = useState(false);

  const balanceNum = parseCountInput(balance);
  const rateNum = rate.trim() === '' ? null : Number(rate.replace(',', '.'));
  const rateOk = rateNum === null || (Number.isFinite(rateNum) && rateNum > 0);
  const expNum = expAmount.trim() === '' ? null : parseCountInput(expAmount);
  const valid = name.trim().length > 0 && (balance.trim() === '' || balanceNum !== null) && rateOk && (expAmount.trim() === '' || expNum !== null);
  const unit = kind === 'airline' ? 'mi' : 'pts';

  const changeKind = (k: ProgramKind) => {
    if (icon === DEFAULT_ICON[kind]) setIcon(DEFAULT_ICON[k]);
    setKind(k);
  };

  const save = () => {
    if (!valid || !data.uid) return;
    const input = {
      name: name.trim(),
      kind,
      icon,
      rate: kind === 'airline' ? null : rateNum,
      expiringAmount: expNum && expNum > 0 ? expNum : null,
      expiringOn: expNum && expNum > 0 ? expOn : null,
    };
    const fail = () => toast.show('Couldn’t save the program. Check your connection.', 'warn');
    if (program) {
      updateProgram(data.uid, program.id, input).catch(fail);
      if (balanceNum !== null && balanceNum !== program.balance) setBalance(data.uid, 'programs', program.id, balanceNum).catch(fail);
    } else {
      createProgram(data.uid, input, balanceNum ?? 0, data.programs).catch(fail);
    }
    router.back();
  };

  const remove = async () => {
    if (!program || !data.uid) return;
    const ok = await dialog.confirm({
      title: `Remove ${program.name}?`,
      message: 'Its miles stop counting. Entries in the flight log stay.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    removeItem(data.uid, 'programs', program.id).catch(() => toast.show('Couldn’t remove it.', 'warn'));
    if (data.settings.goal?.programId === program.id) saveGoal(data.uid, null).catch(() => undefined);
    router.back();
  };

  return (
    <SubScreen
      title={program ? program.name : 'New program'}
      right={program ? <IconButton icon="iTrash" label="Remove program" onPress={remove} /> : undefined}
      footer={<PxButton label={program ? 'Save changes' : 'Add program'} icon="iCheck" height={52} disabled={!valid} onPress={save} />}
    >
      {program ? (
        <Frame innerStyle={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Tile icon={program.icon} />
            <View style={{ flex: 1, gap: 2 }}>
              <Label size={12}>Balance</Label>
              <Txt size={28} lh={34} weight="bold">{`${formatCount(program.balance)} ${unitOf(program)}`}</Txt>
              {program.kind !== 'airline' && program.rate ? (
                <Txt size={13} muted>{`≈ ${formatCount(milesValue(program))} miles`}</Txt>
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PxButton
              label="Log earned"
              size={15}
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/entry', params: { type: 'miles', program: program.id, mode: 'earn' } })}
            />
            <PxButton
              label="Log redeemed"
              kind="secondary"
              size={15}
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/entry', params: { type: 'miles', program: program.id, mode: 'use' } })}
            />
          </View>
        </Frame>
      ) : null}

      <Frame innerStyle={{ padding: 16, gap: 16 }}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. KrisFlyer" maxLength={40} autoCapitalize="words" />
        <View style={{ gap: 6 }}>
          <Label>Type</Label>
          <Segmented options={KINDS} value={kind} onChange={changeKind} />
        </View>
        <View style={{ gap: 8 }}>
          <Label>Picture</Label>
          <IconChoice icons={PROGRAM_ICONS} value={icon} onChange={setIcon} />
        </View>
        <Field
          label={program ? 'Balance (correct it here)' : 'Balance today'}
          value={balance}
          onChangeText={setBalanceText}
          placeholder="0"
          keyboardType="number-pad"
          suffix={unit}
          hint={program ? 'Changing this does not add to the flight log.' : undefined}
        />
        {kind !== 'airline' ? (
          <Field
            label="Points needed per mile"
            value={rate}
            onChangeText={setRate}
            placeholder="e.g. 2.5"
            keyboardType="decimal-pad"
            hint="Used to count these points towards your total miles. Leave empty to leave them out."
            error={rateOk ? null : 'Use a number above 0.'}
          />
        ) : null}
      </Frame>

      <Frame innerStyle={{ padding: 16, gap: 12 }}>
        <Label>Expiring soon</Label>
        <Field label={`${unit === 'mi' ? 'Miles' : 'Points'} expiring`} value={expAmount} onChangeText={setExpAmount} placeholder="Optional" keyboardType="number-pad" />
        <Rows bare>
          <RowButton label="Expiry date" value={expOn ? formatLongDate(expOn) : 'Not set'} onPress={() => setDateOpen(true)} />
        </Rows>
      </Frame>

      {program ? <History refId={program.id} title="Flight log" empty="Nothing logged for this program yet." /> : null}

      <DateSheet
        visible={dateOpen}
        title="Expiry date"
        value={expOn}
        past={false}
        onPick={setExpOn}
        onClear={() => setExpOn(null)}
        onClose={() => setDateOpen(false)}
      />
    </SubScreen>
  );
}
