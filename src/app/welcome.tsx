import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setupFresh, setupSample } from '../data/repo';
import { currencyInfo, CURRENCIES, DEFAULT_CURRENCY } from '../lib/money';
import MeadowScene from '../scenes/MeadowScene';
import { toNight } from '../scenes/tone';
import { usePalette, useTheme } from '../theme/theme';
import { Bramble } from '../ui/Bramble';
import { PxButton } from '../ui/Buttons';
import { Frame } from '../ui/Frame';
import { Rows, RowButton } from '../ui/Layout';
import { useToast } from '../ui/Overlays';
import { OptionSheet } from '../ui/Pickers';
import { Page } from '../ui/Screen';
import { Txt } from '../ui/Txt';

/** The meadow's top sky colour, continued up behind the status bar. */
const SKY = '#7DBFE5';

/** First visit: pick a currency, then start fresh or look around the sample farm. */
export default function WelcomeScreen() {
  const { width, tone } = useTheme();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | 'fresh' | 'sample'>(null);

  const start = async (kind: 'fresh' | 'sample') => {
    setBusy(kind);
    try {
      if (kind === 'fresh') await setupFresh(currency);
      else await setupSample();
    } catch {
      toast.show('Couldn’t save on this phone. Check it has some free storage and try again.', 'warn');
      setBusy(null);
    }
  };

  const cur = currencyInfo(currency);

  return (
    <Page>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        <View style={{ paddingTop: insets.top, backgroundColor: tone === 'night' ? toNight(SKY) : SKY }}>
          <MeadowScene width={width} tone={tone} />
        </View>
        <View style={{ paddingHorizontal: 17, gap: 18, marginTop: 8 }}>
          <Frame inset={c.cardInset} innerStyle={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Bramble size={64} accessory="pencil" />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt face="pixel" weight="bold" size={20} lh={26}>
                Welcome to the farm!
              </Txt>
              <Txt lh={20}>Let’s set up your ledger. Everything you key in stays on this phone.</Txt>
            </View>
          </Frame>
          <Frame innerStyle={{ padding: 16, gap: 10 }}>
            <Rows bare>
              <RowButton label="Your currency" value={`${cur.code} (${cur.symbol.trim()})`} onPress={() => setOpen(true)} />
            </Rows>
            <Txt size={13} muted>
              Used for every amount. Bramble tracks one currency.
            </Txt>
          </Frame>
          <PxButton label="Start fresh" icon="iCheck" height={54} size={17} busy={busy === 'fresh'} disabled={busy !== null} onPress={() => start('fresh')} />
          <Txt size={13} muted center>
            Comes with spending pouches for food, transport, bills and more.
          </Txt>
          <PxButton label="Explore the sample farm" kind="secondary" busy={busy === 'sample'} disabled={busy !== null} onPress={() => start('sample')} />
          <Txt size={13} muted center>
            Fills in the example numbers from the design (in SGD) so you can look around. Clear it later in Settings.
          </Txt>
        </View>
      </ScrollView>
      <OptionSheet
        visible={open}
        title="Currency"
        options={CURRENCIES.map((x) => ({ key: x.code, label: `${x.code} · ${x.symbol.trim()}`, sub: x.name }))}
        value={currency}
        onPick={setCurrency}
        onClose={() => setOpen(false)}
      />
    </Page>
  );
}
