import type { ReactNode } from 'react';
import Svg from 'react-native-svg';

import type { Tone } from './tone';

export type SceneProps = {
  /** Width on screen in points; height follows the scene's aspect ratio. */
  width: number;
  tone?: Tone;
};

type Props = { width: number; vw: number; vh: number; children: ReactNode };

/** A pixel scene drawn on a small grid (130 × 100) and scaled up to the screen width. */
export function SceneSvg({ width, vw, vh, children }: Props) {
  const height = Math.round((width * vh) / vw);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid slice">
      {children}
    </Svg>
  );
}

export function sceneHeight(width: number, vw = 130, vh = 100): number {
  return Math.round((width * vh) / vw);
}
