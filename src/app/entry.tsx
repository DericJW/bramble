import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { unitOf } from '../data/calc';
import { useData } from '../data/DataProvider';
import { buildDraft, deriveForm, formProblem, initialForm, PROBLEM_TEXT, type EntryFormState, type EntryParams, type ProblemCode } from '../data/entryForm';
import { useMoney } from '../data/hooks';
import { deleteEntry, saveEntry } from '../data/repo';
import type { Category, Entry, EntryType, SourceKind } from '../data/types';
import { addMonths, dateRowLabel, formatShortDate, relativeDay } from '../lib/dates';
import { haptic } from '../lib/haptics';
import { displayDigits, formatCount, pressKey } from '../lib/money';
import { useFlip } from '../scenes/Anim';
import { usePrefs } from '../theme/prefs';
import { usePalette } from '../theme/theme';
import { IconButton, PxButton } from '../ui/Buttons';
import { Frame, PressFrame } from '../ui/Frame';
import { Chip, ChipRow, Field, Segmented } from '../ui/Inputs';
import { Keypad } from '../ui/Keypad';
import { Rows, RowButton, ToggleRow } from '../ui/Layout';
import { Sheet, useDialog, useToast } from '../ui/Overlays';
import { DateSheet, OptionSheet, type OptionItem } from '../ui/Pickers';
import { SubScreen } from '../ui/Screen';
import { Sprite } from '../ui/Sprite';
import { Txt } from '../ui/Txt';

type Params = EntryParams;

const TYPES: { value: EntryType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'balance', label: 'Balance' },
  { value: 'miles', label: 'Miles' },
  { value: 'liability', label: 'Owed' },
];

/** Finds the entry being edited. */
function useExistingEntry(id: string | undefined): { entry: Entry | null } {
  const data = useData();
  if (!id) return { entry: null };
  return { entry: data.entries.find((e) => e.id === id) ?? null };
}

export default function EntryScreen() {
  const params = useLocalSearchParams() as Params;
  // An entry that has since been deleted opens as a new one.
  const { entry } = useExistingEntry(params.id);
  return <EntryForm params={params} existing={entry} key={entry?.id ?? 'new'} />;
}

type Sheet = null | 'source' | 'account' | 'program' | 'fromProgram' | 'liability' | 'payFrom' | 'date' | 'note';

function EntryForm({ params, existing }: { params: Params; existing: Entry | null }) {
  const data = useData();
  const c = usePalette();
  const { prefs, setPrefs } = usePrefs();
  const { fmt, currency } = useMoney();
  const dialog = useDialog();
  const toast = useToast();
  const [sheet, setSheet] = useState<Sheet>(null);

  const [f, setF] = useState<EntryFormState>(() => initialForm(params, existing, data, prefs, currency.decimals));
  const set = (patch: Partial<EntryFormState>) => setF((prev) => ({ ...prev, ...patch }));

  const d = deriveForm(f, data, existing);
  const { account, program, fromProgram, liability, category, cents, count, prevBalance, prevCountedAt, liabAfter, roll, transferPoints } = d;
  const allowDecimal = f.type !== 'miles' && currency.decimals === 2;
  const problemCode = formProblem(f, d, data.categories.length > 0);
  const problemAction = problemCode ? PROBLEM_ACTIONS[problemCode] : undefined;

  const save = () => {
    if (problemCode) return;
    const draft = buildDraft(f, d, existing);
    if (!draft) return;
    saveEntry(draft, existing).catch(() => toast.show('Couldn’t save that entry. Please try again.', 'warn'));
    const remember: Parameters<typeof setPrefs>[0] = {};
    if (f.type === 'expense') {
      remember.lastCategoryId = f.categoryId;
      remember.lastSource = { kind: f.sourceKind, id: f.sourceId };
    }
    if (f.type === 'miles') remember.lastProgramId = f.programId;
    if (f.type === 'liability' && f.liabMode === 'payment') remember.lastPayFromId = f.payFromId;
    setPrefs(remember);
    if (prefs.haptics) haptic('success');
    router.back();
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await dialog.confirm({
      title: 'Delete this entry?',
      message: 'Any balance it changed will be put back.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    deleteEntry(existing).catch(() => toast.show('Couldn’t delete. Please try again.', 'warn'));
    if (prefs.haptics) haptic('warn');
    router.back();
  };

  // Works from the latest digits, so quick taps between screen updates are never lost.
  const onKey = (k: string) => {
    setF((prev) => {
      const next = pressKey(prev.digits, k, { allowDecimal });
      return next === prev.digits ? prev : { ...prev, digits: next };
    });
    if (prefs.haptics) haptic('tap');
  };

  /* ---------- text for the amount card ---------- */
  const labels: Record<EntryType, string> = {
    expense: 'Amount spent',
    balance: 'New balance',
    miles: f.milesMode === 'earn' ? 'Miles earned' : f.milesMode === 'use' ? 'Miles redeemed' : 'Miles received',
    liability: f.liabMode === 'payment' ? `Paid to ${liability?.name ?? '…'}` : `Charged to ${liability?.name ?? '…'}`,
  };
  const unit = program ? unitOf(program) : 'mi';
  const sprite =
    f.type === 'expense'
      ? (category?.icon ?? 'receipt')
      : f.type === 'balance'
        ? (account?.icon ?? 'bank')
        : f.type === 'miles'
          ? (program?.icon ?? 'plane')
          : (liability?.icon ?? 'card');
  const saveLabel = existing
    ? 'Save changes'
    : { expense: 'Save expense', balance: 'Update balance', miles: 'Save miles', liability: f.liabMode === 'payment' ? 'Save payment' : 'Save charge' }[f.type];

  /* ---------- option lists ---------- */
  const sourceOptions: OptionItem[] = [
    ...data.accounts.map((a) => ({ key: `account:${a.id}`, label: a.name, sub: `Takes it off this balance (${fmt(a.balance)})`, icon: a.icon })),
    ...data.liabilities
      .filter((l) => l.kind === 'card')
      .map((l) => ({ key: `liability:${l.id}`, label: l.name, sub: 'Adds it to what you owe on this card', icon: l.icon })),
    { key: 'none:', label: 'Not tracked', sub: 'Just log the spending', icon: 'pouch' },
  ];
  const accountOptions: OptionItem[] = data.accounts.map((a) => ({ key: a.id, label: a.name, right: fmt(a.balance), icon: a.icon }));
  const programOptions: OptionItem[] = data.programs.map((p) => ({ key: p.id, label: p.name, right: `${formatCount(p.balance)} ${unitOf(p)}`, icon: p.icon }));
  const liabilityOptions: OptionItem[] = data.liabilities.map((l) => ({ key: l.id, label: l.name, right: fmt(l.balance), icon: l.icon }));
  const payFromOptions: OptionItem[] = [
    { key: 'none', label: 'Don’t change any account', sub: 'Only lower what you owe', icon: 'scroll' },
    ...data.accounts.map((a) => ({ key: a.id, label: a.name, sub: `Takes it off ${fmt(a.balance)}`, icon: a.icon })),
  ];

  const sourceLabel =
    f.sourceKind === 'account'
      ? (data.accounts.find((a) => a.id === f.sourceId)?.name ?? 'Pick one')
      : f.sourceKind === 'liability'
        ? (data.liabilities.find((l) => l.id === f.sourceId)?.name ?? 'Pick one')
        : 'Not tracked';

  const nextDueText = liability?.dueDate ? (liability.repeatsMonthly ? formatShortDate(addMonths(liability.dueDate, 1)) : null) : null;

  return (
    <SubScreen
      title={existing ? 'Edit entry' : 'New entry'}
      closeKind="close"
      compact
      header={existing ? undefined : <Segmented options={TYPES} value={f.type} size={14} height={36} onChange={(type) => set({ type, digits: '' })} />}
      right={existing ? <IconButton icon="iTrash" label="Delete entry" onPress={remove} /> : undefined}
      footer={
        <View style={{ gap: 10 }}>
          <Keypad onKey={onKey} allowDecimal={allowDecimal} keyHeight={42} rowGap={8} />
          <PxButton label={saveLabel} icon="iCheck" height={50} size={18} disabled={!!problemCode} onPress={save} />
        </View>
      }
    >

      <Frame inset={c.cardInset} innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 11, paddingVertical: 9 }}>
        <View style={{ width: 58, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: c.cardInset }}>
          <Sprite name={sprite} size={48} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }} accessibilityLiveRegion="polite">
          <Txt size={12} weight="bold" upper tracking={0.4} muted numberOfLines={1}>
            {f.type === 'expense' && category ? `Spent on ${category.name}` : labels[f.type]}
          </Txt>
          <AmountLine
            prefix={f.type === 'miles' ? '' : currency.symbol}
            text={displayDigits(f.digits)}
            suffix={f.type === 'miles' ? unit : ''}
          />
          {f.type === 'balance' && account && f.digits !== '' ? (
            <Txt size={14} weight="bold" color={cents - prevBalance >= 0 ? c.good : c.warnStrong}>
              {`${fmt(cents - prevBalance, { sign: 'always' })} since ${prevCountedAt ? formatShortDate(prevCountedAt) : 'last time'}`}
            </Txt>
          ) : null}
          {f.type === 'miles' && f.milesMode === 'transfer' && fromProgram && count > 0 ? (
            <Txt size={13} weight="bold" color={c.blue}>
              {`Uses ${formatCount(transferPoints)} ${unitOf(fromProgram)} from ${fromProgram.name}`}
            </Txt>
          ) : null}
        </View>
      </Frame>

      {f.type === 'expense' && data.categories.length > 0 ? (
        <PouchPicker categories={data.categories} value={f.categoryId} onPick={(categoryId) => set({ categoryId })} />
      ) : null}
      {f.type === 'miles' ? (
        <ChipRow label="Earned or redeemed">
          <Chip label="Earned" on={f.milesMode === 'earn'} onPress={() => set({ milesMode: 'earn' })} />
          <Chip label="Redeemed" on={f.milesMode === 'use'} onPress={() => set({ milesMode: 'use' })} />
          {data.programs.length > 1 ? <Chip label="Transfer in" on={f.milesMode === 'transfer'} onPress={() => set({ milesMode: 'transfer' })} /> : null}
        </ChipRow>
      ) : null}
      {f.type === 'liability' ? (
        <ChipRow label="Payment or new charge">
          <Chip label="Payment" on={f.liabMode === 'payment'} onPress={() => set({ liabMode: 'payment' })} />
          <Chip label="New charge" on={f.liabMode === 'charge'} onPress={() => set({ liabMode: 'charge', roll: null })} />
        </ChipRow>
      ) : null}

      {problemCode && problemAction ? (
        <Frame innerStyle={{ padding: 14, gap: 10 }}>
          <Txt lh={20}>{PROBLEM_TEXT[problemCode]}</Txt>
          <PxButton label={problemAction.label} kind="secondary" onPress={problemAction.go} />
        </Frame>
      ) : null}

      {f.type === 'expense' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniField label="Paid from" value={sourceLabel} flex={1.5} onPress={() => setSheet('source')} />
          <MiniField label="Date" value={relativeOrShort(f.date)} flex={1} onPress={() => setSheet('date')} />
          <MiniField label="Note" value={f.note || 'Add'} faint={!f.note} flex={1} onPress={() => setSheet('note')} />
        </View>
      ) : (
      <Rows pad={14}>
        {f.type === 'balance' ? <RowButton label="Account" value={account?.name ?? 'Pick one'} onPress={() => setSheet('account')} /> : null}
        {f.type === 'balance' && account ? (
          <RowButton label="Last counted" value={`${fmt(prevBalance)}${prevCountedAt ? ` · ${formatShortDate(prevCountedAt)}` : ''}`} />
        ) : null}
        {f.type === 'miles' ? (
          <RowButton label={f.milesMode === 'transfer' ? 'Into' : 'Program'} value={program?.name ?? 'Pick one'} onPress={() => setSheet('program')} />
        ) : null}
        {f.type === 'miles' && f.milesMode === 'transfer' ? (
          <RowButton label="From" value={fromProgram?.name ?? 'Pick one'} onPress={() => setSheet('fromProgram')} />
        ) : null}
        {f.type === 'liability' ? <RowButton label="Liability" value={liability?.name ?? 'Pick one'} onPress={() => setSheet('liability')} /> : null}
        {f.type === 'liability' && liability ? (
          <RowButton label="Balance after" value={fmt(liabAfter)} valueColor={liabAfter < 0 ? c.warnStrong : undefined} />
        ) : null}
        {f.type === 'liability' && f.liabMode === 'payment' ? (
          <RowButton
            label="Paid from"
            value={f.payFromId ? (data.accounts.find((a) => a.id === f.payFromId)?.name ?? 'Pick one') : 'No account'}
            onPress={() => setSheet('payFrom')}
          />
        ) : null}
        {f.type === 'liability' && f.liabMode === 'payment' && liability?.dueDate ? (
          <ToggleRow
            label={nextDueText ? `Move due date to ${nextDueText}` : 'Mark as settled (clear due date)'}
            hint={liability.kind === 'loan' && liability.termPayments ? 'Also counts this as one instalment' : undefined}
            value={roll}
            onChange={(v) => set({ roll: v })}
          />
        ) : null}
        <RowButton label="Date" value={dateRowLabel(f.date)} onPress={() => setSheet('date')} />
        <RowButton label="Note" value={f.note || 'Optional'} onPress={() => setSheet('note')} />
      </Rows>
      )}

      <NoteSheet
        visible={sheet === 'note'}
        note={f.note}
        placeholder={f.type === 'expense' ? 'e.g. lunch with the team' : f.type === 'miles' ? 'e.g. card spend, flight' : 'Optional'}
        onDone={(note) => {
          set({ note });
          setSheet(null);
        }}
      />

      <OptionSheet
        visible={sheet === 'source'}
        title="Paid from"
        options={sourceOptions}
        value={`${f.sourceKind}:${f.sourceKind === 'none' ? '' : (f.sourceId ?? '')}`}
        onPick={(key) => {
          const [kind, id] = key.split(':');
          set({ sourceKind: kind as SourceKind, sourceId: id || null });
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'account'}
        title="Which account?"
        options={accountOptions}
        value={f.accountId}
        onPick={(id) => set({ accountId: id })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'program'}
        title={f.milesMode === 'transfer' ? 'Transfer into' : 'Which program?'}
        options={programOptions.filter((o) => f.milesMode !== 'transfer' || o.key !== f.fromProgramId)}
        value={f.programId}
        onPick={(id) => set({ programId: id })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'fromProgram'}
        title="Transfer from"
        options={programOptions.filter((o) => o.key !== f.programId)}
        value={f.fromProgramId}
        onPick={(id) => set({ fromProgramId: id })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'liability'}
        title="Which liability?"
        options={liabilityOptions}
        value={f.liabilityId}
        onPick={(id) => {
          const l = data.liabilities.find((x) => x.id === id);
          set({ liabilityId: id, payFromId: l?.payFromAccountId ?? f.payFromId, roll: null });
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'payFrom'}
        title="Paid from"
        options={payFromOptions}
        value={f.payFromId ?? 'none'}
        onPick={(id) => set({ payFromId: id === 'none' ? null : id })}
        onClose={() => setSheet(null)}
      />
      <DateSheet visible={sheet === 'date'} value={f.date} onPick={(date) => set({ date })} onClose={() => setSheet(null)} />
    </SubScreen>
  );
}

/** "S$ 24.50▌" with a blinking pixel caret. */
function AmountLine({ prefix, text, suffix }: { prefix: string; text: string; suffix: string }) {
  const c = usePalette();
  const flip = useFlip(1000);
  const big = text.replace(/[^0-9]/g, '').length > 7;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
      {prefix ? (
        <Txt size={22} weight="bold" muted>
          {prefix}
        </Txt>
      ) : null}
      <Txt size={big ? 32 : 42} lh={big ? 38 : 48} weight="bold" numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1 }}>
        {text}
      </Txt>
      {suffix ? (
        <Txt size={20} weight="bold" muted>
          {suffix}
        </Txt>
      ) : null}
      <View style={{ width: 6, height: 28, alignSelf: 'center', backgroundColor: c.ink, opacity: flip ? 0 : 1 }} />
    </View>
  );
}

const PROBLEM_ACTIONS: Partial<Record<ProblemCode, { label: string; go: () => void }>> = {
  noCategories: { label: 'Add pouches', go: () => router.push('/budgets') },
  noAccount: { label: 'Add an account', go: () => router.push({ pathname: '/account/[id]', params: { id: 'new' } }) },
  noProgram: { label: 'Add a program', go: () => router.push({ pathname: '/program/[id]', params: { id: 'new' } }) },
  noLiability: { label: 'Add a liability', go: () => router.push({ pathname: '/liability/[id]', params: { id: 'new' } }) },
};

/** "Today", "Yesterday" or "12 Oct": short enough for the compact row. */
function relativeOrShort(d: Date): string {
  const r = relativeDay(d);
  return r === 'Today' || r === 'Yesterday' ? r : formatShortDate(d);
}

/** Every pouch at once as picture tiles, four to a row; the chosen pouch is named above. */
function PouchPicker({ categories, value, onPick }: { categories: Category[]; value: string | null; onPick: (id: string) => void }) {
  const c = usePalette();
  const rows: Category[][] = [];
  for (let i = 0; i < categories.length; i += 4) rows.push(categories.slice(i, i + 4));
  return (
    <View style={{ gap: 8 }} accessibilityLabel="Pouch">
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((cat) => {
            const on = cat.id === value;
            return (
              <PressFrame
                key={cat.id}
                style={{ flex: 1 }}
                border={on ? c.btn : undefined}
                inset={on ? c.tint.green : undefined}
                drop={on ? null : undefined}
                innerStyle={{ height: 46, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => onPick(cat.id)}
                accessibilityLabel={on ? `${cat.name}, chosen` : cat.name}
              >
                <Sprite name={cat.icon} size={30} />
              </PressFrame>
            );
          })}
          {Array.from({ length: 4 - row.length }, (_, k) => (
            <View key={`gap${k}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** A small framed button showing one setting: a tiny label over its value. */
function MiniField({ label, value, onPress, flex, faint }: { label: string; value: string; onPress: () => void; flex: number; faint?: boolean }) {
  const c = usePalette();
  return (
    <PressFrame style={{ flex }} innerStyle={{ paddingHorizontal: 10, paddingVertical: 6, gap: 1 }} onPress={onPress} accessibilityLabel={`${label}: ${value}`}>
      <Txt size={11} weight="bold" upper tracking={0.4} muted numberOfLines={1}>
        {label}
      </Txt>
      <Txt size={14} weight="bold" color={faint ? c.faint : c.ink} numberOfLines={1}>
        {value}
      </Txt>
    </PressFrame>
  );
}

/** Typing a note happens in its own sheet, so the number pad never gets in the way. */
function NoteSheet({ visible, note, placeholder, onDone }: { visible: boolean; note: string; placeholder: string; onDone: (note: string) => void }) {
  const [text, setText] = useState(note);
  const [shownFor, setShownFor] = useState(false);
  // Start from the saved note each time the sheet opens.
  if (visible !== shownFor) {
    setShownFor(visible);
    if (visible) setText(note);
  }
  return (
    <Sheet visible={visible} title="Note" onClose={() => onDone(text.trim())}>
      <View style={{ gap: 12 }}>
        <Field
          label="What was it for?"
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          autoFocus
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={() => onDone(text.trim())}
        />
        <PxButton label="Done" icon="iCheck" onPress={() => onDone(text.trim())} />
      </View>
    </Sheet>
  );
}
