import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MeadowScene from '../scenes/MeadowScene';
import { AnimView, MotionContext } from '../scenes/Anim';
import { sceneHeight } from '../scenes/SceneSvg';
import { toNight } from '../scenes/tone';
import { useTheme } from '../theme/theme';
import { IconButton, Spacer } from './Buttons';
import { Dither } from './Dither';
import { Frame } from './Frame';
import { Icon } from './Sprite';
import { SceneKicker, SceneTitle, Txt } from './Txt';

/** Height of the wooden tab bar above the home indicator. */
export const TAB_BAR_BASE = 66;

export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE + Math.max(insets.bottom, 8);
}

/** Light or dark status bar text while this screen is in front. */
export function useStatusBar(light: boolean) {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(light ? 'light' : 'dark');
    }, [light]),
  );
}

/** Parchment background with its dither texture. */
export function Page({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.page }}>
      <Dither color={c.dither} />
      {children}
    </View>
  );
}

type TabScreenProps = {
  /** Draws the illustrated header at the given width. */
  scene: (width: number) => ReactNode;
  kicker: string;
  title: string;
  /** Light title text (for the dusk scene on Liabilities). */
  light?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  fab?: { label: string; onPress: () => void } | null;
};

/** The layout shared by the five tabs: animated scene, title, then cards. */
export function TabScreen({ scene, kicker, title, light, actions, children, fab }: TabScreenProps) {
  const { width, motion, night } = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const tabBar = useTabBarHeight();
  const sh = sceneHeight(width);
  useStatusBar(night || !!light);
  return (
    <MotionContext.Provider value={motion && focused}>
      <Page>
        <ScrollView
          contentContainerStyle={{ paddingBottom: tabBar + (fab ? 96 : 36) }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ height: sh }}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {scene(width)}
            </View>
            <View
              style={{
                paddingTop: insets.top + 10,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <View style={{ gap: 4, flexShrink: 1 }}>
                <SceneKicker light={light}>{kicker}</SceneKicker>
                <SceneTitle light={light}>{title}</SceneTitle>
              </View>
              {actions ? <View style={{ flexDirection: 'row', gap: 12, paddingTop: 2 }}>{actions}</View> : null}
            </View>
          </View>
          <View style={{ marginTop: -24, paddingHorizontal: 17, gap: 24 }}>{children}</View>
        </ScrollView>
        {fab ? <Fab label={fab.label} onPress={fab.onPress} bottom={tabBar + 22} /> : null}
      </Page>
    </MotionContext.Provider>
  );
}

/** The hopping green square "+" button. */
export function Fab({ label, onPress, bottom }: { label: string; onPress: () => void; bottom: number }) {
  const { c } = useTheme();
  const [down, setDown] = useState(false);
  return (
    <AnimView name="pxHop" dur={1600} style={{ position: 'absolute', right: 20, bottom }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => setDown(true)}
        onPressOut={() => setDown(false)}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={6}
      >
        <Frame
          bg={c.fab}
          hi={c.fabHi}
          lo={c.fabLo}
          drop={down ? 'transparent' : c.shadow}
          dropSize={6}
          style={down ? { transform: [{ translateY: 4 }] } : null}
          innerStyle={{ width: 54, height: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="iPlus" size={30} color={c.fabIcon} />
        </Frame>
      </Pressable>
    </AnimView>
  );
}

type SubScreenProps = {
  title: string;
  onClose?: () => void;
  /** 'close' shows ✕ (for modals); 'back' shows ‹. */
  closeKind?: 'close' | 'back';
  right?: ReactNode;
  children: ReactNode;
  /** Pinned under the scrolling content (Save button, keypad). */
  footer?: ReactNode;
  /** Content starts right under the header instead of tucking into it (screens with a keypad). */
  compact?: boolean;
};

/** Layout for forms and detail screens: a meadow header strip with a back button. */
export function SubScreen({ title, onClose, closeKind = 'back', right, children, footer, compact }: SubScreenProps) {
  const { width, tone, night, motion } = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const full = sceneHeight(width, 130, 50);
  // Bramble stands in the meadow 33 grid rows down; push the scene down far enough that the
  // back button (top inset + 56pt) never covers him, and fill the gap with sky.
  const sceneTop = Math.max(0, Math.round(insets.top + 58 - (33 * width) / 130));
  const headerH = sceneTop + full;
  useStatusBar(night);
  const close = onClose ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <MotionContext.Provider value={motion && focused}>
      <Page>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: footer ? 16 : insets.bottom + 28 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ height: headerH, overflow: 'hidden', backgroundColor: tone === 'night' ? toNight('#7DBFE5') : '#7DBFE5' }}>
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} pointerEvents="none">
                <MeadowScene width={width} tone={tone} />
              </View>
              <View
                style={{
                  paddingTop: insets.top + 6,
                  paddingHorizontal: 17,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <IconButton icon={closeKind === 'close' ? 'iClose' : 'iChevLeft'} label={closeKind === 'close' ? 'Close' : 'Back'} onPress={close} />
                <View style={{ flex: 1, alignItems: 'center', paddingTop: 10 }}>
                  <Txt
                    face="pixel"
                    weight="bold"
                    size={22}
                    lh={28}
                    center
                    numberOfLines={1}
                    shadow={night ? '#0E0B09' : '#FFFDF5'}
                    shadowSize={3}
                    accessibilityRole="header"
                  >
                    {title}
                  </Txt>
                </View>
                {right ?? <Spacer />}
              </View>
            </View>
            <View style={{ paddingHorizontal: 17, gap: 16, marginTop: compact ? 0 : -8 }}>{children}</View>
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: 17, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10) + 6 }}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </Page>
    </MotionContext.Provider>
  );
}

/** Shown while your data is on its way from Firestore. */
export function LoadingScreen({ text = 'Tending the farm…' }: { text?: string }) {
  const { width, tone } = useTheme();
  return (
    <Page>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18 }}>
        <MeadowScene width={width} tone={tone} />
        <Txt face="pixel" weight="bold" size={18} center>
          {text}
        </Txt>
      </View>
    </Page>
  );
}
