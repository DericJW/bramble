import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, AppState, Platform, useColorScheme, useWindowDimensions } from 'react-native';

import { isNightTime } from '../lib/dates';
import { MotionContext } from '../scenes/Anim';
import type { Tone } from '../scenes/tone';
import type { Face } from './fonts';
import { DAY, NIGHT, type Palette } from './palette';
import { usePrefs } from './prefs';

/** On a wide browser window the app keeps a phone-sized column. */
export const MAX_APP_WIDTH = 480;

export type Theme = {
  c: Palette;
  night: boolean;
  tone: Tone;
  /** Face used for body text ('pixel' when the user picked the all-pixel look). */
  body: Face;
  /** Animations allowed (user setting and system reduce-motion). */
  motion: boolean;
  /** Width of the app column. */
  width: number;
  /** The current time, refreshed every minute. */
  now: Date;
};

const ThemeContext = createContext<Theme>({
  c: DAY,
  night: false,
  tone: 'day',
  body: 'rounded',
  motion: true,
  width: 390,
  now: new Date(),
});

function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return now;
}

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduce(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v: boolean) => setReduce(v));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { prefs } = usePrefs();
  const scheme = useColorScheme();
  const now = useMinuteClock();
  const reduceMotion = useReduceMotion();
  const { width: windowWidth } = useWindowDimensions();

  const night =
    prefs.theme === 'night' ||
    (prefs.theme === 'time' && isNightTime(now)) ||
    (prefs.theme === 'system' && scheme === 'dark');
  const width = Platform.OS === 'web' ? Math.min(windowWidth, MAX_APP_WIDTH) : windowWidth;
  const motion = prefs.motion && !reduceMotion;

  const value = useMemo<Theme>(
    () => ({
      c: night ? NIGHT : DAY,
      night,
      tone: night ? 'night' : 'day',
      body: prefs.bodyFont,
      motion,
      width,
      now,
    }),
    [night, prefs.bodyFont, motion, width, now],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MotionContext.Provider value={motion}>{children}</MotionContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function usePalette(): Palette {
  return useContext(ThemeContext).c;
}
