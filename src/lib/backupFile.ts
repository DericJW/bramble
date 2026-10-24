/**
 * Backup files on Android and in Expo Go: the backup is handed to the share sheet as text
 * (save it to Notes, Drive, email it to yourself…). To restore, paste that text back in
 * Settings. The web app version (backupFile.web.ts) uses real files instead.
 */
import { Share } from 'react-native';

export type SaveResult = 'saved' | 'cancelled';

export async function saveBackup(filename: string, text: string): Promise<SaveResult> {
  const result = await Share.share({ title: filename, message: text });
  return result.action === Share.dismissedAction ? 'cancelled' : 'saved';
}

/** Native builds restore by pasting the backup text instead. */
export const canPickBackupFile = false;

export async function pickBackupFile(): Promise<string | null> {
  return null;
}
