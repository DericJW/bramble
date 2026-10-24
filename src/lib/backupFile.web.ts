/**
 * Backup files in the web app (and the Home Screen app on iPhone).
 *
 * Saving opens the share sheet where it can (on iPhone: Save to Files, AirDrop, Mail…) and
 * otherwise downloads the file. Opening uses the browser's file picker.
 */

export type SaveResult = 'saved' | 'cancelled';

export async function saveBackup(filename: string, text: string): Promise<SaveResult> {
  const file = new File([text], filename, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Bramble backup' });
      return 'saved';
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'cancelled';
      // Sharing failed for another reason: fall back to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'saved';
}

/** The web app can open a backup file directly. */
export const canPickBackupFile = true;

/** Lets you choose a backup file and returns its text (null if you cancel). */
export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json,text/plain,.txt';
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (!f) resolve(null);
      else f.text().then(resolve, reject);
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
