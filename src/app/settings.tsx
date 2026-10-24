import Constants from 'expo-constants';
import { useState } from 'react';
import { View } from 'react-native';

import { useData } from '../data/DataProvider';
import { clearEverything, restoreFarm, saveSettings } from '../data/repo';
import { backupText, readBackup, type ParsedBackup } from '../data/store';
import { canPickBackupFile, pickBackupFile, saveBackup } from '../lib/backupFile';
import { dayKey, formatLongDate, formatSmartDate } from '../lib/dates';
import { currencyInfo, CURRENCIES } from '../lib/money';
import { usePrefs, type BodyFont, type ThemeMode } from '../theme/prefs';
import { usePalette } from '../theme/theme';
import { PxButton } from '../ui/Buttons';
import { Frame } from '../ui/Frame';
import { Field, Segmented } from '../ui/Inputs';
import { Rows, RowButton, SectionTitle, ToggleRow } from '../ui/Layout';
import { Sheet, useDialog, useToast } from '../ui/Overlays';
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
  const data = useData();
  const { prefs, setPrefs } = usePrefs();
  const dialog = useDialog();
  const toast = useToast();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);

  const countDays = String(data.settings.countEveryDays);

  const exportBackup = () => {
    const name = `bramble-backup-${dayKey(new Date())}.json`;
    // Straight from the tap, so the share sheet is allowed to open.
    saveBackup(name, backupText())
      .then((result) => {
        if (result === 'saved') {
          setPrefs({ lastBackupAt: Date.now() });
          toast.show('Backup ready. Keep it somewhere safe, like iCloud Drive.');
        }
      })
      .catch(() => toast.show('Couldn’t make the backup. Please try again.', 'warn'));
  };

  const restore = async (text: string | null) => {
    if (!text) return;
    let backup: ParsedBackup;
    try {
      backup = readBackup(text.trim());
    } catch (e) {
      await dialog.alert('Can’t use that backup', e instanceof Error ? e.message : 'That isn’t a Bramble backup.');
      return;
    }
    const when = backup.exportedAt ? ` from ${formatLongDate(backup.exportedAt)}` : '';
    const ok = await dialog.confirm({
      title: 'Replace everything on this phone?',
      message: `This backup${when} has ${backup.farm.accounts.length} accounts and ${backup.farm.entries.length} entries. What’s on this phone now will be replaced.`,
      confirmLabel: 'Restore backup',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await restoreFarm(backup.farm);
      setPasteOpen(false);
      setPasted('');
      toast.show('Backup restored.');
    } catch {
      toast.show('Couldn’t restore it. Check your phone has some free storage.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const startRestore = () => {
    if (!canPickBackupFile) {
      setPasteOpen(true);
      return;
    }
    pickBackupFile()
      .then(restore)
      .catch(() => toast.show('Couldn’t open that file.', 'warn'));
  };

  const wipe = async () => {
    const ok = await dialog.confirm({
      title: 'Delete all your data?',
      message: 'Every account, program, liability, pouch and entry on this phone will be deleted. Only a backup can bring them back.',
      confirmLabel: 'Delete everything',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await clearEverything();
      toast.show('All cleared. Fresh fields!');
    } catch {
      toast.show('Couldn’t delete everything. Please try again.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const lastBackup = prefs.lastBackupAt ? `Last backup: ${formatSmartDate(new Date(prefs.lastBackupAt))}` : 'No backup made from this phone yet.';

  return (
    <SubScreen title="Settings" compact>
      <View style={{ paddingTop: 8 }}>
        <SectionTitle title="Look and feel" />
      </View>
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
            onChange={(d) => saveSettings({ countEveryDays: Number(d) }).catch(() => undefined)}
          />
        </View>
      </Frame>

      <SectionTitle title="Your data" />
      <Frame innerStyle={{ padding: 16, gap: 12 }}>
        <Txt muted lh={20}>
          Everything is saved on this phone only. Nothing is sent anywhere, so export a backup now and then and keep it in iCloud Drive or Files.
        </Txt>
        <Txt size={13} weight="bold" color={prefs.lastBackupAt ? c.muted : c.warnStrong}>
          {lastBackup}
        </Txt>
        <PxButton label="Export backup" icon="iUp" onPress={exportBackup} />
        <PxButton label="Restore from a backup" kind="secondary" busy={busy && pasteOpen} onPress={startRestore} />
        <PxButton label="Delete all my data" kind="danger" icon="iTrash" busy={busy && !pasteOpen} onPress={wipe} />
      </Frame>

      <Txt size={13} muted center style={{ marginTop: 8 }}>
        {`Bramble ${version} · made with care by a small hedgehog`}
      </Txt>

      <Sheet visible={pasteOpen} title="Restore from a backup" onClose={() => setPasteOpen(false)}>
        <View style={{ gap: 12 }}>
          <Txt muted lh={20}>
            Paste the text of a Bramble backup here.
          </Txt>
          <Field label="Backup" value={pasted} onChangeText={setPasted} multiline autoCapitalize="none" autoCorrect={false} placeholder="Paste the backup text" style={{ maxHeight: 160 }} />
          <PxButton label="Restore" busy={busy} disabled={!pasted.trim()} onPress={() => restore(pasted)} />
        </View>
      </Sheet>

      <OptionSheet
        visible={currencyOpen}
        title="Currency"
        options={CURRENCIES.map((cur) => ({ key: cur.code, label: `${cur.code} · ${cur.symbol.trim()}`, sub: cur.name }))}
        value={data.settings.currency}
        onPick={(code) => saveSettings({ currency: code }).catch(() => undefined)}
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
