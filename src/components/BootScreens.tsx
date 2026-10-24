import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signOut } from '../data/auth';
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

/** Shown until src/config/firebase.ts has real values in it. */
export function ConfigMissing() {
  return (
    <Shell title="Almost there!">
      <Txt lh={22}>
        Hedgerow keeps your numbers in your own Firebase project. Paste your Firebase web config into{' '}
        <Txt weight="bold">src/config/firebase.ts</Txt>, publish the rules in <Txt weight="bold">firestore.rules</Txt>, then restart the app.
      </Txt>
      <Txt lh={22} muted>
        The README walks through it step by step: create a Firebase project, add a web app, turn on Email/Password and Anonymous sign-in, and
        create a Firestore database.
      </Txt>
    </Shell>
  );
}

/** Shown when Firestore refuses to load the farm (usually missing security rules). */
export function DataError({ message }: { message: string }) {
  return (
    <Shell title="Can’t open the farm">
      <Txt lh={22}>{message}</Txt>
      <PxButton kind="secondary" label="Sign out" onPress={() => signOut().catch(() => undefined)} />
    </Shell>
  );
}
