import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

/** The fine 3pt checker texture on the parchment background. */
export function Dither({ color }: { color: string }) {
  const id = 'dither' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" x={0} y={0} width={6} height={6}>
            <Rect x={3} y={0} width={3} height={3} fill={color} />
            <Rect x={0} y={3} width={3} height={3} fill={color} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
