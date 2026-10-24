import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { History } from '../../components/History';
import { markPaidDraft } from '../../data/actions';
import { dueAmountOf, loanProgress } from '../../data/calc';
import { useData } from '../../data/DataProvider';
import { useMoney } from '../../data/hooks';
import { createLiability, removeItem, saveEntry, setBalance, updateLiability } from '../../data/repo';
import type { Liability, LiabilityKind } from '../../data/types';
import { addMonths, daysBetween, dueText, formatLongDate, formatShortDate, formatShortMonthYear } from '../../lib/dates';
import { haptic } from '../../lib/haptics';
import { centsToInput, parseCountInput, parseMoneyInput } from '../../lib/money';
import { LIABILITY_ICONS } from '../../sprites';
import { usePrefs } from '../../theme/prefs';
import { usePalette, useTheme } from '../../theme/theme';
import { IconButton, PxButton } from '../../ui/Buttons';
import { Frame } from '../../ui/Frame';
import { Field, IconChoice, Segmented } from '../../ui/Inputs';
import { Rows, RowButton, ToggleRow } from '../../ui/Layout';
import { useDialog, useToast } from '../../ui/Overlays';
import { DateSheet, OptionSheet } from '../../ui/Pickers';
import { LoadingScreen, SubScreen } from '../../ui/Screen';
import { Tile } from '../../ui/Sprite';
import { Label, Txt } from '../../ui/Txt';

const KINDS: { value: LiabilityKind; label: string }[] = [
  { value: 'card', label: 'Card' },
  { value: 'loan', label: 'Loan' },
  { value: 'personal', label: 'Personal' },
];

const DEFAULT_ICON: Record<LiabilityKind, string> = { card: 'card', loan: 'car', personal: 'letter' };

export default function LiabilityScreen() {
  const { id } = useLocalSearchParams() as { id?: string };
  const data = useData();
  const isNew = !id || id === 'new';
  const liability = isNew ? null : (data.liabilities.find((l) => l.id === id) ?? null);
  if (!isNew && !liability) {
    return data.ready ? (
      <SubScreen title="Liability">
        <Frame innerStyle={{ padding: 16 }}>
          <Txt>This liability has been removed.</Txt>
        </Frame>
      </SubScreen>
    ) : (
      <LoadingScreen />
    );
  }
  return <LiabilityForm key={id ?? 'new'} liability={liability} />;
}

function LiabilityForm({ liability }: { liability: Liability | null }) {
  const data = useData();
  const c = usePalette();
  const { now } = useTheme();
  const { prefs } = usePrefs();
  const { fmt, currency } = useMoney();
  const dialog = useDialog();
  const toast = useToast();

  const [name, setName] = useState(liability?.name ?? '');
  const [kind, setKind] = useState<LiabilityKind>(liability?.kind ?? 'card');
  const [icon, setIcon] = useState(liability?.icon ?? 'card');
  const [balance, setBalanceText] = useState(liability ? centsToInput(liability.balance, currency.decimals) : '');
  const [dueDate, setDueDate] = useState<Date | null>(liability?.dueDate ?? null);
  const [repeats, setRepeats] = useState(liability ? liability.repeatsMonthly : true);
  const [dueAmount, setDueAmount] = useState(liability?.dueAmount ? centsToInput(liability.dueAmount, currency.decimals) : '');
  const [term, setTerm] = useState(liability?.termPayments ? String(liability.termPayments) : '');
  const [made, setMade] = useState(liability?.paymentsMade ? String(liability.paymentsMade) : '');
  const [payFrom, setPayFrom] = useState<string | null>(liability?.payFromAccountId ?? null);
  const [note, setNote] = useState(liability?.note ?? '');
  const [sheet, setSheet] = useState<null | 'date' | 'payFrom'>(null);

  const balanceCents = parseMoneyInput(balance);
  const dueCents = dueAmount.trim() === '' ? null : parseMoneyInput(dueAmount);
  const termNum = term.trim() === '' ? null : parseCountInput(term);
  const madeNum = made.trim() === '' ? null : parseCountInput(made);
  const valid =
    name.trim().length > 0 &&
    (balance.trim() === '' || balanceCents !== null) &&
    (dueAmount.trim() === '' || dueCents !== null) &&
    (term.trim() === '' || (termNum !== null && termNum > 0)) &&
    (made.trim() === '' || madeNum !== null);

  const changeKind = (k: LiabilityKind) => {
    if (icon === DEFAULT_ICON[kind]) setIcon(DEFAULT_ICON[k]);
    if (k === 'personal' && !liability) setRepeats(false);
    if (k !== 'personal' && !liability) setRepeats(true);
    setKind(k);
  };

  const save = () => {
    if (!valid) return;
    const input = {
      name: name.trim(),
      kind,
      icon,
      dueDate,
      repeatsMonthly: dueDate ? repeats : false,
      dueAmount: dueCents && dueCents > 0 ? dueCents : null,
      termPayments: kind === 'loan' && termNum ? termNum : null,
      paymentsMade: kind === 'loan' && termNum ? Math.min(madeNum ?? 0, termNum) : null,
      payFromAccountId: payFrom,
      note: note.trim(),
    };
    const fail = () => toast.show('Couldn’t save. Please try again.', 'warn');
    if (liability) {
      updateLiability(liability.id, input).catch(fail);
      if (balanceCents !== null && balanceCents !== liability.balance) setBalance('liabilities', liability.id, balanceCents).catch(fail);
    } else {
      createLiability(input, balanceCents ?? 0).catch(fail);
    }
    router.back();
  };

  const remove = async () => {
    if (!liability) return;
    const ok = await dialog.confirm({
      title: `Remove ${liability.name}?`,
      message: 'It stops counting towards what you owe. Payments already logged stay in your history.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    removeItem('liabilities', liability.id).catch(() => toast.show('Couldn’t remove it.', 'warn'));
    router.back();
  };

  const markPaid = async () => {
    if (!liability) return;
    const amount = dueAmountOf(liability);
    const from = data.accounts.find((a) => a.id === liability.payFromAccountId);
    const ok = await dialog.confirm({
      title: `Mark ${liability.name} as paid?`,
      message:
        `This logs a payment of ${fmt(amount)}${from ? ` from ${from.name}` : ''}` +
        (liability.repeatsMonthly && liability.dueDate ? ` and moves the due date to ${formatShortDate(addMonths(liability.dueDate, 1))}.` : '.'),
      confirmLabel: 'Mark as paid',
    });
    if (!ok) return;
    saveEntry(markPaidDraft(liability, now), null).catch(() => toast.show('Couldn’t save the payment.', 'warn'));
    if (prefs.haptics) haptic('success');
    toast.show(`${liability.name} marked as paid`);
  };

  const loan = liability ? loanProgress(liability) : null;
  const days = liability?.dueDate ? daysBetween(now, liability.dueDate) : null;

  return (
    <SubScreen
      title={liability ? liability.name : 'New liability'}
      right={liability ? <IconButton icon="iTrash" label="Remove liability" onPress={remove} /> : undefined}
      footer={<PxButton label={liability ? 'Save changes' : 'Add liability'} icon="iCheck" height={52} disabled={!valid} onPress={save} />}
    >
      {liability ? (
        <Frame innerStyle={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Tile icon={liability.icon} />
            <View style={{ flex: 1, gap: 2 }}>
              <Label size={12}>Owed</Label>
              <Txt size={28} lh={34} weight="bold" color={c.warnStrong} numberOfLines={1} adjustsFontSizeToFit>
                {fmt(liability.balance)}
              </Txt>
              {days !== null && liability.dueDate ? (
                <Txt size={13} weight="bold" color={days <= 7 ? c.warnStrong : c.muted}>
                  {`${dueText(days)} · ${formatLongDate(liability.dueDate)}`}
                </Txt>
              ) : (
                <Txt size={13} muted>
                  No due date
                </Txt>
              )}
              {loan ? (
                <Txt size={13} muted>
                  {`${loan.made} of ${loan.total} payments made${loan.endDate ? ` · ends ${formatShortMonthYear(loan.endDate)}` : ''}`}
                </Txt>
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {liability.dueDate && liability.balance > 0 ? <PxButton label="Mark as paid" size={15} style={{ flex: 1 }} onPress={markPaid} /> : null}
            <PxButton
              label="Log payment"
              kind="secondary"
              size={15}
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/entry', params: { type: 'liability', liability: liability.id } })}
            />
          </View>
          <PxButton
            label="Add a new charge"
            kind="secondary"
            size={15}
            onPress={() => router.push({ pathname: '/entry', params: { type: 'liability', liability: liability.id, mode: 'charge' } })}
          />
        </Frame>
      ) : null}

      <Frame innerStyle={{ padding: 16, gap: 16 }}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Visa card" maxLength={40} autoCapitalize="words" />
        <View style={{ gap: 6 }}>
          <Label>Type</Label>
          <Segmented options={KINDS} value={kind} onChange={changeKind} />
        </View>
        <View style={{ gap: 8 }}>
          <Label>Picture</Label>
          <IconChoice icons={LIABILITY_ICONS} value={icon} onChange={setIcon} />
        </View>
        <Field
          label={liability ? 'Owed (correct it here)' : 'Owed today'}
          value={balance}
          onChangeText={setBalanceText}
          placeholder="0.00"
          keyboardType="decimal-pad"
          prefix={currency.symbol}
          hint={liability ? 'For payments and new charges, use the buttons above so your history stays right.' : undefined}
          error={balance.trim() !== '' && balanceCents === null ? 'That doesn’t look like an amount.' : null}
        />
        <Field label="Note" value={note} onChangeText={setNote} placeholder="Optional, e.g. concert tickets" maxLength={60} />
      </Frame>

      <Frame innerStyle={{ padding: 16, gap: 12 }}>
        <Label>Due date</Label>
        <Rows bare>
          <RowButton label="Next due" value={dueDate ? formatLongDate(dueDate) : 'No due date'} onPress={() => setSheet('date')} />
          {dueDate ? <ToggleRow label="Comes round every month" hint="Card statements and loan instalments" value={repeats} onChange={setRepeats} /> : null}
          <RowButton
            label="Usually paid from"
            value={payFrom ? (data.accounts.find((a) => a.id === payFrom)?.name ?? 'Removed account') : 'Not set'}
            onPress={() => setSheet('payFrom')}
          />
        </Rows>
        {dueDate ? (
          <Field
            label={kind === 'loan' ? 'Instalment' : 'Amount due'}
            value={dueAmount}
            onChangeText={setDueAmount}
            placeholder={kind === 'loan' ? 'e.g. 680' : 'Leave empty for the whole balance'}
            keyboardType="decimal-pad"
            prefix={currency.symbol}
            error={dueAmount.trim() !== '' && dueCents === null ? 'That doesn’t look like an amount.' : null}
          />
        ) : null}
        {kind === 'loan' ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Payments in total" value={term} onChangeText={setTerm} placeholder="e.g. 84" keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Paid so far" value={made} onChangeText={setMade} placeholder="e.g. 52" keyboardType="number-pad" />
            </View>
          </View>
        ) : null}
      </Frame>

      {liability ? <History refId={liability.id} empty="No payments or charges logged yet." /> : null}

      <DateSheet
        visible={sheet === 'date'}
        title="Next due date"
        value={dueDate}
        past={false}
        onPick={setDueDate}
        onClear={() => setDueDate(null)}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'payFrom'}
        title="Usually paid from"
        options={[
          { key: 'none', label: 'Not set', sub: 'Payments won’t change any account', icon: 'scroll' },
          ...data.accounts.map((a) => ({ key: a.id, label: a.name, right: fmt(a.balance), icon: a.icon })),
        ]}
        value={payFrom ?? 'none'}
        onPick={(k) => setPayFrom(k === 'none' ? null : k)}
        onClose={() => setSheet(null)}
      />
    </SubScreen>
  );
}
