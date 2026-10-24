import { Platform, Text, type TextProps, type TextStyle } from 'react-native';

import { fontStyle, type Weight } from '../theme/fonts';
import { useTheme } from '../theme/theme';

export type TxtProps = TextProps & {
  size?: number;
  weight?: Weight;
  /** 'pixel' always uses Pixelify Sans; 'body' follows the user's text style setting. */
  face?: 'body' | 'pixel';
  color?: string;
  muted?: boolean;
  upper?: boolean;
  center?: boolean;
  /** Line height in points (defaults to 1.3 × size). */
  lh?: number;
  /** Letter spacing in points. */
  tracking?: number;
  /** Hard pixel drop shadow colour (no blur), like the titles over the scenes. */
  shadow?: string;
  shadowSize?: number;
};

const SHADOW_RADIUS = Platform.OS === 'android' ? 0.01 : 0;

export function Txt({
  size = 15,
  weight = 'medium',
  face = 'body',
  color,
  muted,
  upper,
  center,
  lh,
  tracking,
  shadow,
  shadowSize = 2,
  style,
  ...rest
}: TxtProps) {
  const { c, body } = useTheme();
  const font = fontStyle(face === 'pixel' ? 'pixel' : body, weight);
  const base: TextStyle = {
    fontSize: size,
    lineHeight: lh ?? Math.round(size * 1.3),
    color: color ?? (muted ? c.muted : c.ink),
  };
  const extra: TextStyle = {};
  if (upper) extra.textTransform = 'uppercase';
  if (center) extra.textAlign = 'center';
  if (tracking !== undefined) extra.letterSpacing = tracking;
  if (shadow) {
    extra.textShadowColor = shadow;
    extra.textShadowOffset = { width: shadowSize, height: shadowSize };
    extra.textShadowRadius = SHADOW_RADIUS;
  }
  return <Text maxFontSizeMultiplier={1.35} {...rest} style={[font, base, extra, style]} />;
}

/** Small uppercase label ("NET WORTH", "TOTAL MILES"). */
export function Label(props: TxtProps) {
  return <Txt size={13} weight="bold" upper tracking={0.5} muted {...props} />;
}

/** Big pixel title drawn over a scene. */
export function SceneTitle({ children, light }: { children: string; light?: boolean }) {
  const { c } = useTheme();
  const color = light ? '#FFF3D6' : c.sceneText;
  const shadow = light ? '#2A2230' : c.sceneShadow;
  return (
    <Txt face="pixel" weight="bold" size={30} lh={34} color={color} shadow={shadow} shadowSize={3} accessibilityRole="header">
      {children}
    </Txt>
  );
}

/** Uppercase line above a scene title ("HARVEST STORE"). */
export function SceneKicker({ children, light }: { children: string; light?: boolean }) {
  const { c } = useTheme();
  const color = light ? '#FFF3D6' : c.sceneText;
  const shadow = light ? '#2A2230' : c.sceneShadow;
  return (
    <Txt size={13} weight="bold" upper tracking={0.5} color={color} shadow={shadow} shadowSize={2}>
      {children}
    </Txt>
  );
}
