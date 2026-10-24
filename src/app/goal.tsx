import { router } from 'expo-router';
import { useState } from 'react';

import { useData } from '../data/DataProvider';
import { saveGoal } from '../data/repo';
import { formatCount, parseCountInput } from '../lib/money';
import { PxButton } from '../ui/Buttons';
import { Frame } from '../ui/Frame';
import { Field } from '../ui/Inputs';
import { Rows, RowButton } from '../ui/Layout';
import { useToast } from '../ui/Overlays';
import { OptionSheet } from '../ui/Pickers';
import { SubScreen } from '../ui/Screen';
import { Txt } from '../ui/Txt';

export default function GoalScreen() {
  const data = useData();
  const toast = useToast();
  const goal = data.settings.goal;
  const [label, setLabel] = useState(goal?.label ?? '');
  const [programId, setProgramId] = useState<string | null>(goal ? goal.programId : (data.programs.find((p) => p.kind === 'airline')?.id ?? null));
  const [target, setTarget] = useState(goal ? String(goal.target) : '');
  const [picking, setPicking] = useState(false);
  const targetNum = parseCountInput(target);
  const valid = label.trim().length > 0 && targetNum !== null && targetNum > 0;
  const program = data.programs.find((p) => p.id === programId);

  const save = () => {
    if (!valid || !data.uid || targetNum === null) return;
    saveGoal(data.uid, { label: label.trim(), programId, target: targetNum }).catch(() => toast.show('Couldn’t save the goal.', 'warn'));
    router.back();
  };

  const clear = () => {
    if (!data.uid) return;
    saveGoal(data.uid, null).catch(() => toast.show('Couldn’t remove the goal.', 'warn'));
    router.back();
  };

  return (
    <SubScreen title="Miles goal" footer={<PxButton label="Save goal" icon="iCheck" height={52} disabled={!valid} onPress={save} />}>
      <Frame innerStyle={{ padding: 16, gap: 16 }}>
        <Txt muted lh={20}>
          Pick a trip and how many miles it needs. The little plane on the Miles tab flies closer as you save up.
        </Txt>
        <Field label="What for?" value={label} onChangeText={setLabel} placeholder="e.g. Japan trip" maxLength={30} autoCapitalize="sentences" />
        <Field label="Miles needed" value={target} onChangeText={setTarget} placeholder="e.g. 120000" keyboardType="number-pad" suffix="mi" />
        <Rows bare>
          <RowButton label="Counting" value={program ? program.name : 'All my miles'} onPress={() => setPicking(true)} />
        </Rows>
        {targetNum && targetNum > 0 ? <Txt size={13} muted>{`Target: ${formatCount(targetNum)} miles`}</Txt> : null}
      </Frame>
      {goal ? <PxButton label="Remove goal" kind="secondary" onPress={clear} /> : null}
      <OptionSheet
        visible={picking}
        title="Count which miles?"
        options={[
          { key: 'all', label: 'All my miles', sub: 'Airline miles plus converted points', icon: 'star' },
          ...data.programs.map((p) => ({ key: p.id, label: p.name, icon: p.icon })),
        ]}
        value={programId ?? 'all'}
        onPick={(k) => setProgramId(k === 'all' ? null : k)}
        onClose={() => setPicking(false)}
      />
    </SubScreen>
  );
}
