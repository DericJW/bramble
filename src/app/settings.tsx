import Constants from 'expo-constants';
import { useState } from 'react';
import { View } from 'react-native';

import { authErrorMessage, signOut, upgradeGuest, useAuth } from '../data/auth';
import { useData } from '../data/DataProvider';
import { clearEverything, saveSettings } from '../data/repo';
import { currencyInfo, CURRENCIES } from '../lib/money';
import { usePrefs, type BodyFont, type ThemeMode } from '../theme/prefs';
import { usePalette } from '../theme/theme';
import { PxButton } from '../ui/Buttons';
import { Frame } from '../ui/Frame';
import { Field, Segmented } from '../ui/Inputs';
import { Rows, RowButton, SectionTitle, ToggleRow } from '../ui/Layout';
import { useDialog, useToast } from '../ui/Overlays';
import { OptionSheet } from '../ui/Pickers';
import { SubScreen } from '../ui/Screen';
import { Label, Txt } from '../ui/Txt';

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'time', label: 'Auto' },
  { value: 'day', label: 'Day' },
  { value: 'night', label: 'Night' },
  { value: 'system', label: 'Phone' },
];

const FONTS: { value: BodyFont; label: string }[] = [
  { value: 'rounded', label: 'Rounded' },
  { value: 'pixel', label: 'All pixel' },
];

const COUNT_DAYS: { value: '7' | '14' | '30'; label: string }[] = [
  { value: '7', label: '1 week' },
  { value: '14', label: '2 weeks' },
  { value: '30', label: '1 month' },
];

export default function SettingsScreen() {
  const c = usePalette();
  const { user, refresh } = useAuth();
  const data = useData();
  const { prefs, setPrefs } = usePrefs();
  const dialog = useDialog();
  const toast = useToast();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const guest = !!user?.isAnonymous;
  const countDays = String(data.settings.countEveryDays);

  const upgrade = async () => {
    setBusy(true);
    setUpgradeError(null);
    try {
      await upgradeGuest(email, password);
      refresh();
      toast.show('Saved! Sign in with this email on any device.');
      setPassword('');
    } catch (e) {
      setUpgradeError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doSignOut = async () => {
    const ok = await dialog.confirm(
      guest
        ? {
            title: 'Sign out of a guest farm?',
            message: 'Guest farms can’t be opened again after signing out. Save it to an email first if you want to keep it.',
            confirmLabel: 'Sign out anyway',
            destructive: true,
          }
        : { title: 'Sign out?', message: 'Your farm stays safe in Firebase. Sign in again any time.', confirmLabel: 'Sign out' },
    );
    if (ok) signOut().catch((e) => toast.show(authErrorMessage(e), 'warn'));
  };

  const wipe = async () => {
    const ok = await dialog.confirm({
      title: 'Delete all your data?',
      message: 'Every account, program, liability, pouch and entry will be deleted from Firebase. This can’t be undone.',
      confirmLabel: 'Delete everything',
      destructive: true,
    });
    if (!ok || !data.uid) return;
    setBusy(true);
    try {
      await clearEverything(data.uid);
      toast.show('All cleared. Fresh fields!');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Couldn’t delete everything. Try again.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SubScreen title="Settings" compact>
      <View style={{ paddingTop: 8 }}>
        <SectionTitle title="Your farm" />
      </View>
      <Frame innerStyle={{ padding: 16, gap: 12 }}>
        {guest ? (
          <>
            <Txt weight="bold">You’re using a guest farm</Txt>
            <Txt muted lh={20}>
              It lives on this device’s sign-in only. Add an email and password to keep it safe and open it on other devices.
            </Txt>
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="At least 6 characters" error={upgradeError} />
            <PxButton label="Save my farm" busy={busy} disabled={!email || password.length < 6} onPress={upgrade} />
          </>
        ) : (
          <View style={{ gap: 2 }}>
            <Label size={12}>Signed in as</Label>
            <Txt weight="bold">{user?.email ?? 'Unknown'}</Txt>
          </View>
        )}
        <PxButton label="Sign out" kind="secondary" icon="iDoor" onPress={doSignOut} />
      </Frame>

      <SectionTitle title="Look and feel" />
      <Frame innerStyle={{ padding: 16, gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Label>Day or night</Label>
          <Segmented options={THEMES} value={prefs.theme} onChange={(theme) => setPrefs({ theme })} />
          <Txt size={13} muted>
            {prefs.theme === 'time' ? 'Night falls at 7pm and the sun is up at 6am.' : prefs.theme === 'system' ? 'Follows your phone’s dark mode.' : ' '}
          </Txt>
        </View>
        <View style={{ gap: 6 }}>
          <Label>Text style</Label>
          <Segmented options={FONTS} value={prefs.bodyFont} onChange={(bodyFont) => setPrefs({ bodyFont })} />
        </View>
        <Rows bare>
          <ToggleRow label="Animations" hint="Clouds, critters and smoke" value={prefs.motion} onChange={(motion) => setPrefs({ motion })} />
          <ToggleRow label="Hide amounts" hint="Same as the eye on Home" value={prefs.hideAmounts} onChange={(hideAmounts) => setPrefs({ hideAmounts })} />
          <ToggleRow label="Vibration" hint="Little buzzes when you tap and save" value={prefs.haptics} onChange={(haptics) => setPrefs({ haptics })} />
        </Rows>
      </Frame>

      <SectionTitle title="Money" />
      <Frame innerStyle={{ padding: 16, gap: 14 }}>
        <Rows bare>
          <RowButton label="Currency" value={`${currencyInfo(data.settings.currency).code} (${currencyInfo(data.settings.currency).symbol.trim()})`} onPress={() => setCurrencyOpen(true)} />
        </Rows>
        <View style={{ gap: 6 }}>
          <Label>Remind me to recount after</Label>
          <Segmented
            options={COUNT_DAYS}
            value={(['7', '14', '30'] as const).find((d) => d === countDays) ?? '14'}
            onChange={(d) => data.uid && saveSettings(data.uid, { countEveryDays: Number(d) }).catch(() => undefined)}
          />
        </View>
      </Frame>

      <SectionTitle title="Your data" />
      <Frame innerStyle={{ padding: 16, gap: 12 }}>
        <Txt muted lh={20}>
          Everything is stored in your own Firebase project and only your sign-in can read it.
        </Txt>
        <PxButton label="Delete all my data" kind="danger" icon="iTrash" busy={busy} onPress={wipe} />
      </Frame>

      <Txt size={13} muted center style={{ marginTop: 8 }}>
        {`Hedgerow ${version} · made with care by Bramble`}
      </Txt>

      <OptionSheet
        visible={currencyOpen}
        title="Currency"
        options={CURRENCIES.map((cur) => ({ key: cur.code, label: `${cur.code} · ${cur.symbol.trim()}`, sub: cur.name }))}
        value={data.settings.currency}
        onPick={(code) => data.uid && saveSettings(data.uid, { currency: code }).catch(() => undefined)}
        onClose={() => setCurrencyOpen(false)}
        footer={
          <Txt size={13} muted lh={18} style={{ color: c.muted }}>
            Changing the currency only changes the symbol. Amounts are not converted.
          </Txt>
        }
      />
    </SubScreen>
  );
}
