import { View } from 'react-native';

import { useEntriesFor } from '../data/hooks';
import { Frame } from '../ui/Frame';
import { Rows, SectionTitle } from '../ui/Layout';
import { Txt } from '../ui/Txt';
import { EntryRow } from './EntryRow';

/** The latest entries that mention an account, program or liability. */
export function History({ refId, title = 'History', empty }: { refId: string; title?: string; empty: string }) {
  const { entries, loading } = useEntriesFor(refId);
  const shown = entries.slice(0, 40);
  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      <SectionTitle title={title} />
      {loading ? (
        <Txt muted>Loading…</Txt>
      ) : shown.length === 0 ? (
        <Frame innerStyle={{ padding: 16 }}>
          <Txt muted>{empty}</Txt>
        </Frame>
      ) : (
        <Rows>
          {shown.map((e) => (
            <EntryRow key={e.id} entry={e} withDate />
          ))}
        </Rows>
      )}
    </View>
  );
}
