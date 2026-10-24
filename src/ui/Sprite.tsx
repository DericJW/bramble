import { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { getSprite, tintOf, type SpriteDef } from '../sprites';
import type { TintName } from '../theme/palette';
import { useTheme } from '../theme/theme';

type SpriteProps = {
  name: string;
  /** Width on screen. Defaults to 3 points per sprite pixel. */
  size?: number;
  /** Colour for mono icons (layers drawn in 'currentColor'). */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

function SpriteImpl({ name, size, color, style }: SpriteProps) {
  const def: SpriteDef = getSprite(name);
  const w = size ?? def.w * 3;
  const h = (w * def.h) / def.w;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${def.w} ${def.h}`} style={style}>
      {def.layers.map((layer, i) => (
        <Path
          key={i}
          d={layer[1]}
          fill={layer[0] === 'currentColor' ? (color ?? '#3B2A20') : layer[0]}
          fillRule={layer.length === 3 ? 'evenodd' : 'nonzero'}
        />
      ))}
    </Svg>
  );
}

export const Sprite = memo(SpriteImpl);

/** A mono interface icon in the given colour (24pt by default). */
export function Icon({ name, size = 24, color }: { name: string; size?: number; color?: string }) {
  const { c } = useTheme();
  return <Sprite name={name} size={size} color={color ?? c.ink} />;
}

type TileProps = {
  icon: string;
  size?: number;
  tint?: TintName;
  /** Coloured pixel frame around the tile (the home summary tiles). */
  frame?: string;
  style?: StyleProp<ViewStyle>;
};

/** The square tinted tile an item sprite sits in. */
export function Tile({ icon, size = 44, tint, frame, style }: TileProps) {
  const { c } = useTheme();
  const bg = c.tint[tint ?? tintOf(icon)];
  const inner = (
    <View style={{ width: size, height: size, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Sprite name={icon} size={Math.round((size * 36) / 44)} />
      {frame ? null : (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(59,42,30,0.12)' }}
        />
      )}
    </View>
  );
  if (!frame) return <View style={style}>{inner}</View>;
  return (
    <View style={[{ alignSelf: 'flex-start' }, style]}>
      <View style={{ height: 3, marginHorizontal: 3, backgroundColor: frame }} />
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 3, backgroundColor: frame }} />
        {inner}
        <View style={{ width: 3, backgroundColor: frame }} />
      </View>
      <View style={{ height: 3, marginHorizontal: 3, backgroundColor: frame }} />
    </View>
  );
}
