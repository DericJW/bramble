/**
 * Your farm, kept on this device only.
 *
 * Everything lives in memory while the app runs and is written to the device's storage after
 * each change (AsyncStorage: the browser's local storage in the Home Screen web app, app
 * storage on Android and in Expo Go). Nothing is sent anywhere. Export a backup from Settings
 * to keep a copy somewhere else.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { backupText as farmBackupText, emptyFarm, parseFarm, serializeFarm, type Farm } from './farm';

export type { Farm };
export { emptyFarm, parseFarm, readBackup, type ParsedBackup } from './farm';

export type StoreState = {
  loaded: boolean;
  /** Set when the device storage could not be read or written. */
  error: string | null;
  farm: Farm;
};

const KEY = 'bramble:farm:v1';

let state: StoreState = { loaded: false, error: null, farm: emptyFarm() };
const listeners = new Set<() => void>();
let writing: Promise<void> = Promise.resolve();

function emit(next: StoreState) {
  state = next;
  listeners.forEach((l) => l());
}

export function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStoreState(): StoreState {
  return state;
}

export function getFarm(): Farm {
  return state.farm;
}

/** Reads the farm from device storage. Safe to call more than once. */
export async function loadFarm(): Promise<void> {
  if (state.loaded) return;
  if (state.error) emit({ ...state, error: null });
  try {
    if (Platform.OS === 'web') askToKeepStorage();
    const text = await AsyncStorage.getItem(KEY);
    emit({ loaded: true, error: null, farm: text ? parseFarm(JSON.parse(text)) : emptyFarm() });
  } catch (e) {
    // Stay "not loaded" so nothing can be set up over the top of the stored farm.
    emit({
      loaded: false,
      error: `Couldn’t read your farm from this device (${e instanceof Error ? e.message : 'unknown error'}).`,
      farm: emptyFarm(),
    });
  }
}

/** Applies a change, shows it straight away, and saves it to the device. */
export function updateFarm(change: (farm: Farm) => Farm): Promise<void> {
  const farm = change(state.farm);
  emit({ ...state, farm });
  const text = serializeFarm(farm);
  writing = writing
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(KEY, text))
    .then(
      () => {
        if (state.error) emit({ ...state, error: null });
      },
      (e: unknown) => {
        emit({ ...state, error: 'Couldn’t save on this device. Your phone may be out of storage.' });
        throw e;
      },
    );
  return writing;
}

/** A backup file's contents for the farm on this device. */
export function backupText(): string {
  return farmBackupText(state.farm);
}

/** Ask the browser not to clear this app's storage when the phone runs low on space. */
function askToKeepStorage() {
  try {
    const nav = (globalThis as { navigator?: { storage?: { persist?: () => Promise<boolean> } } }).navigator;
    nav?.storage?.persist?.().catch(() => undefined);
  } catch {
    // Not available in this browser.
  }
}
