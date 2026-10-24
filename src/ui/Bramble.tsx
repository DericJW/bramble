import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { TipPart } from '../data/calc';
import { AnimView, useAnimFrame, useFlip } from '../scenes/Anim';
import { usePalette } from '../theme/theme';
import { Frame } from './Frame';
import { Txt } from './Txt';

/** Bramble the hedgehog, the farm's bookkeeper. Drawn on a 16 × 16 grid. */

const BODY: [string, string][] = [
  ['#5A3420', 'M5 0h1v1H5z M7 0h2v1H7z M10 0h1v1h-1z M3 1h1v1H3z M5 1h6v1H5z M12 1h1v1h-1z M2 2h3v1H2z M11 2h3v1h-3z M1 3h2v1H1z M13 3h2v1h-2z M1 4h1v1H1z M14 4h1v1h-1z M0 5h2v1H0z M14 5h2v1h-2z M0 6h1v4H0z M15 6h1v4h-1z M1 10h1v1H1z M14 10h1v1h-1z M1 11h2v1H1z M13 11h2v1h-2z M2 12h2v1H2z M12 12h2v1h-2z M3 13h2v1H3z M11 13h2v1h-2z'],
  ['#8A5530', 'M5 2h6v1H5z M3 3h10v1H3z M2 4h3v1H2z M11 4h3v1h-3z M2 5h2v1H2z M12 5h2v1h-2z M1 6h2v4H1z M13 6h2v4h-2z M2 10h2v1H2z M12 10h2v1h-2z M3 11h2v1H3z M11 11h2v1h-2z M4 12h8v1H4z M5 13h6v1H5z'],
  ['#B07A45', 'M6 2h1v1H6z M9 2h1v1H9z M4 3h1v1H4z M11 3h1v1h-1z M1 6h1v1H1z M14 6h1v1h-1z'],
  ['#F6E2C0', 'M5 4h6v1H5z M4 5h8v1H4z M3 6h10v4H3z M4 10h8v1H4z M5 11h6v1H5z'],
  ['#E8CFA6', 'M5 11h6v1H5z M3 9h1v1H3z M12 9h1v1h-1z'],
  ['#2A1A10', 'M7 8h2v1H7z'],
  ['#F2A6B8', 'M4 8h1v1H4z M11 8h1v1h-1z'],
  ['#D9A57E', 'M4 14h2v1H4z M10 14h2v1h-2z'],
];

const EYES_OPEN: [string, string][] = [
  ['#2A1A10', 'M5 6h2v2H5z M9 6h2v2H9z'],
  ['#FFFFFF', 'M6 6h1v1H6z M10 6h1v1h-1z'],
];
const EYES_SHUT: [string, string][] = [['#2A1A10', 'M5 7h2v1H5z M9 7h2v1H9z']];

export type Accessory = 'none' | 'cart' | 'coin' | 'cap' | 'pencil' | 'plane' | 'jar';

const ACCESSORIES: Record<Accessory, [string, string][]> = {
  none: [],
  cart: [
    ['#C8553D', 'M1 11h3v3H1z'],
    ['#9E3F2C', 'M1 11h3v1H1z'],
    ['#E8B23A', 'M2 12h1v1H2z'],
  ],
  coin: [
    ['#E8B23A', 'M11 10h4v4h-4z'],
    ['#C99528', 'M12 11h2v2h-2z'],
    ['#FFE59A', 'M11 10h1v1h-1z'],
  ],
  cap: [
    ['#5B9BD5', 'M4 1h8v1H4z M5 0h6v1H5z M12 2h2v1h-2z M14 3h1v1h-1z'],
    ['#FFFFFF', 'M15 4h1v1h-1z'],
  ],
  pencil: [
    ['#E07A9A', 'M13 8h2v1h-2z'],
    ['#F2C14E', 'M13 9h2v4h-2z'],
    ['#3B2A20', 'M13 13h2v1h-2z'],
  ],
  plane: [
    ['#C8553D', 'M11 11h4v1h-4z M12 10h1v1h-1z'],
    ['#F2EBD8', 'M11 12h4v1h-4z'],
  ],
  jar: [
    ['#5A3420', 'M11 9h4v5h-4z'],
    ['#F3F0D8', 'M12 10h2v3h-2z'],
    ['#FFE88A', 'M12 11h1v1h-1z'],
  ],
};

type BrambleProps = { size?: number; accessory?: Accessory; sleepy?: boolean };

function BrambleImpl({ size = 64, accessory = 'none', sleepy = false }: BrambleProps) {
  const blink = useAnimFrame({ name: 'pxBlink', dur: 4000 });
  const shut = sleepy || (blink !== null && blink.o === 0);
  const layers = [...BODY, ...(shut ? EYES_SHUT : EYES_OPEN), ...ACCESSORIES[accessory]];
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      {layers.map(([fill, d], i) => (
        <Path key={i} fill={fill} d={d} />
      ))}
    </Svg>
  );
}

export const Bramble = memo(BrambleImpl);

type BoxProps = { sky: string; ground: string; accessory?: Accessory; sleepy?: boolean; size?: number };

/** Bramble standing in a little framed window of sky and grass. */
export function BrambleBox({ sky, ground, accessory, sleepy, size = 70 }: BoxProps) {
  const c = usePalette();
  const groundH = Math.round((size * 18) / 70);
  return (
    <Frame drop={null} border={c.border} innerStyle={{ width: size, height: size, overflow: 'hidden', backgroundColor: sky }}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: groundH, backgroundColor: ground }} />
      <AnimView
        name="pxHop"
        dur={1400}
        style={{ position: 'absolute', left: (size - 64 * (size / 70)) / 2, bottom: 0 }}
        pointerEvents="none"
      >
        <Bramble size={Math.round(64 * (size / 70))} accessory={accessory} sleepy={sleepy} />
      </AnimView>
    </Frame>
  );
}

type TipCardProps = {
  parts: TipPart[];
  sky: string;
  ground: string;
  accessory?: Accessory;
  sleepy?: boolean;
  title?: string;
};

/** "Bramble says..." card with a blinking ▼ like a game dialogue box. */
export function TipCard({ parts, sky, ground, accessory, sleepy, title = 'Bramble' }: TipCardProps) {
  const c = usePalette();
  const flip = useFlip(1000);
  return (
    <Frame inset={c.cardInset} innerStyle={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 11, paddingBottom: 15 }}>
      <BrambleBox sky={sky} ground={ground} accessory={accessory} sleepy={sleepy} />
      <View style={{ flex: 1, gap: 4, paddingTop: 2 }} accessible accessibilityLabel={`${title}: ${parts.map((p) => p.text).join('')}`}>
        <Txt size={13} weight="bold" upper tracking={0.5} color={c.good}>
          {title}
        </Txt>
        <Txt lh={21}>
          {parts.map((p, i) =>
            p.tone ? (
              <Txt key={i} lh={21} weight="bold" color={p.tone === 'good' ? c.good : c.warnStrong}>
                {p.text}
              </Txt>
            ) : (
              p.text
            ),
          )}
        </Txt>
      </View>
      <View style={{ position: 'absolute', right: 10, bottom: 6, opacity: flip ? 0 : 1 }}>
        <Svg width={15} height={9} viewBox="0 0 5 3">
          <Path fill={c.ink} d="M0 0h5v1H0z M1 1h3v1H1z M2 2h1v1H2z" />
        </Svg>
      </View>
    </Frame>
  );
}
