import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { G } from 'react-native-svg';

import { clockNow, subscribeClock, subscribeNever } from '../lib/clock';
import { frameKey, parseFrameKey, type AnimDirection, type AnimFrame, type AnimName, type AnimSpec } from './animMath';

/**
 * Whether things may move. Off when the user turned animations off, when the system asks
 * for reduced motion, and for screens that are not on top (so hidden tabs stay still).
 */
export const MotionContext = createContext<boolean>(true);

export function useMotion(): boolean {
  return useContext(MotionContext);
}

/** Current frame of an animation, or null when motion is off. */
export function useAnimFrame(spec: AnimSpec): AnimFrame | null {
  const on = useContext(MotionContext);
  const { name, dur, delay, dir } = spec;
  const key = useSyncExternalStore(
    on ? subscribeClock : subscribeNever,
    () => (on ? frameKey({ name, dur, delay, dir }, clockNow()) : ''),
    () => '',
  );
  return key ? parseFrameKey(key) : null;
}

type AnimProps = {
  name: AnimName;
  dur: number;
  delay?: number;
  dir?: AnimDirection;
  /** Opacity before any animation runs (and when motion is off). */
  base?: number;
  children: ReactNode;
};

/** Animated SVG group: moves and fades its children following one of the named animations. */
export function Anim({ name, dur, delay, dir, base = 1, children }: AnimProps) {
  const f = useAnimFrame({ name, dur, delay, dir });
  const opacity = f && f.o !== null ? f.o : base;
  const x = f ? f.x : 0;
  const y = f ? f.y : 0;
  return (
    <G opacity={opacity} transform={`translate(${x}, ${y})`}>
      {children}
    </G>
  );
}

type AnimViewProps = {
  name: 'pxHop' | 'pxBob' | 'pxSway' | 'pxDrift';
  dur: number;
  delay?: number;
  dir?: AnimDirection;
  /** Screen points per animation unit (pxHop moves 3 units at most). */
  unit?: number;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  children?: ReactNode;
};

/** The same stepped motion for ordinary views (hopping buttons, bobbing mascots). */
export function AnimView({ name, dur, delay, dir, unit = 1, style, pointerEvents, children }: AnimViewProps) {
  const f = useAnimFrame({ name, dur, delay, dir });
  const x = f ? f.x * unit : 0;
  const y = f ? f.y * unit : 0;
  return (
    <View pointerEvents={pointerEvents} style={[style, { transform: [{ translateX: x }, { translateY: y }] }]}>
      {children}
    </View>
  );
}

/** 1 or 0, flipping every half cycle (blinking carets, alternating sprites). */
export function useFlip(dur: number, delay = 0): 0 | 1 {
  const f = useAnimFrame({ name: 'pxA', dur, delay });
  return f && f.o === 0 ? 1 : 0;
}
