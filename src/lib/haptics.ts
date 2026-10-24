import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** A small buzz on phones (nothing on the web). */
export function haptic(kind: 'tap' | 'success' | 'warn'): void {
  if (Platform.OS === 'web') return;
  const done = () => undefined;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(done);
  else if (kind === 'warn') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(done);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(done);
}
