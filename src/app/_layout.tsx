import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setStatusBarStyle } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DataError } from '../components/BootScreens';
import { DataProvider, useData } from '../data/DataProvider';
import { loadFarm } from '../data/store';
import { fontAssets } from '../theme/fontAssets';
import { PrefsProvider, usePrefs } from '../theme/prefs';
import { MAX_APP_WIDTH, ThemeProvider, useTheme } from '../theme/theme';
import { DialogProvider, ToastProvider } from '../ui/Overlays';
import { LoadingScreen } from '../ui/Screen';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  return (
    <SafeAreaProvider>
      <PrefsProvider>
        <ThemeProvider>
          <DataProvider>
            <WebColumn>
              <DialogProvider>
                <ToastProvider>
                  <RootNavigator fontsReady={fontsLoaded || !!fontError} />
                </ToastProvider>
              </DialogProvider>
            </WebColumn>
          </DataProvider>
        </ThemeProvider>
      </PrefsProvider>
    </SafeAreaProvider>
  );
}

/** In a wide browser window, keep the app phone-sized in the middle. */
function WebColumn({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={[styles.webOuter, { backgroundColor: c.night ? '#121410' : '#CDBB98' }]}>
      <View style={[styles.webInner, { maxWidth: MAX_APP_WIDTH }]}>{children}</View>
    </View>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { loaded: prefsLoaded } = usePrefs();
  const data = useData();
  const { c, night } = useTheme();

  const booting = !fontsReady || !prefsLoaded;

  useEffect(() => {
    if (!booting) SplashScreen.hideAsync().catch(() => undefined);
  }, [booting]);

  // Screens set their own status bar style when they come into view; this covers the
  // moments before that (loading) and the switch between day and night.
  useEffect(() => {
    setStatusBarStyle(night ? 'light' : 'dark');
  }, [night]);

  if (booting) return null;

  const needsSetup = data.ready && data.needsSetup;
  const inApp = data.ready && !data.needsSetup;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.page } }}>
        <Stack.Protected guard={needsSetup}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
        <Stack.Protected guard={inApp}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="entry" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="recount" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="account/[id]" />
          <Stack.Screen name="program/[id]" />
          <Stack.Screen name="liability/[id]" />
          <Stack.Screen name="budgets" />
          <Stack.Screen name="goal" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="search" />
        </Stack.Protected>
      </Stack>
      {!data.ready ? (
        <View style={StyleSheet.absoluteFill}>
          {data.error ? <DataError message={data.error} onRetry={() => loadFarm().catch(() => undefined)} /> : <LoadingScreen />}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  webOuter: { flex: 1, alignItems: 'center' },
  webInner: { flex: 1, width: '100%', overflow: 'hidden' },
});
