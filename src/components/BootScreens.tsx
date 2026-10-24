import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MeadowScene from '../scenes/MeadowScene';
import { useTheme } from '../theme/theme';
import { Bramble } from '../ui/Bramble';
import { PxButton } from '../ui/Buttons';
import { Frame } from '../ui/Frame';
import { Page } from '../ui/Screen';
import { Txt } from '../ui/Txt';

function Shell({ title, children }: { title: string; children: ReactNode }) {
  const { width, tone } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Page>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={{ paddingTop: insets.top }}>
          <MeadowScene width={width} tone={tone} />
        </View>
        <View style={{ paddingHorizontal: 17, gap: 16, marginTop: 8 }}>
          <Frame innerStyle={{ padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Bramble size={56} accessory="pencil" />
              <Txt face="pixel" weight="bold" size={22} lh={28} style={{ flex: 1 }}>
                {title}
              </Txt>
            </View>
            {children}
          </Frame>
        </View>
      </ScrollView>
    </Page>
  );
}

/** Shown when the farm can't be read from this device's storage. */
export function DataError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Shell title="Can’t open the farm">
      <Txt lh={22}>{message}</Txt>
      <Txt lh={22} muted>
        Nothing has been deleted. Try again, or close the app and open it again.
      </Txt>
      <PxButton kind="secondary" label="Try again" onPress={onRetry} />
    </Shell>
  );
}
