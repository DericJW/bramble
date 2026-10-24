import { View } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';

import { Anim } from '../scenes/Anim';
import { toneFn, type Tone } from '../scenes/tone';

/** Point along the flight path from home (t = 0) to the destination (t = 1). */
function pathPoint(t: number): [number, number] {
  return [12 + 66 * t, 18 - 6 * t - 11 * Math.sin(Math.PI * t)];
}

/** The little flight from your house to the mountains, with the plane as far along as your goal. */
export function GoalPath({ pct, tone, label }: { pct: number; tone: Tone; label: string }) {
  const c = toneFn(tone);
  const t = Math.max(0, Math.min(1, pct / 100));
  const done: string[] = [];
  const todo: string[] = [];
  const steps = 16;
  for (let k = 0; k <= steps; k++) {
    const s = k / steps;
    const [x, y] = pathPoint(s);
    const rect = `M${Math.round(x)} ${Math.round(y)}h2v1h-2z`;
    if (s <= t) done.push(rect);
    else todo.push(rect);
  }
  const [px, py] = pathPoint(t);
  const dx = Math.round(px - 70);
  const dy = Math.round(py - 6);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ borderWidth: 3, borderColor: tone === 'night' ? '#0E0B09' : '#3B2A20', aspectRatio: 106 / 30 }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 106 30">
        <Rect x={0} y={0} width={106} height={20} fill={c('#D6E8F3')} />
        <Rect x={0} y={12} width={106} height={8} fill={c('#E4F0F7')} />
        <Path fill={c('#FFFFFF')} d="M20 2h8v2h-8z M22 1h4v1h-4z M40 14h6v1h-6z M42 13h3v1h-3z" />
        <Path fill={c('#8DC46F')} d="M0 20h106v10H0z" />
        <Path fill={c('#7FBA62')} d="M0 24h106v6H0z" />
        <Path fill={c('#A9D684')} d="M0 20h106v1H0z" />
        <Path fill={c('#6E8FB0')} d="M92 8h4v2h2v2h2v2h2v2h2v4H84v-4h2v-2h2v-2h2v-2h2z" />
        <Path fill={c('#57789A')} d="M96 10h2v2h-2z M98 12h2v2h-2z M100 14h2v2h-2z M102 16h2v4h-2z" />
        <Path fill={c('#F4F8FB')} d="M92 8h4v2h-4z M90 10h8v1h-8z M91 11h2v1h-2z M95 11h2v1h-2z" />
        <Path fill={c('#3B2A20')} d="M78 11h12v1H78z" />
        <Path fill={c('#D9473A')} d="M79 12h10v1H79z M80 14h8v1h-8z M81 13h1v7h-1z M86 13h1v7h-1z" />
        <Path fill={c('#C8553D')} d="M3 14h7v1H3z M4 13h5v1H4z M5 12h3v1H5z" />
        <Path fill={c('#F6E7C8')} d="M4 15h5v5H4z" />
        <Path fill={c('#8E5A35')} d="M6 17h1v3H6z" />
        <Path fill={c('#8FC8E8')} d="M8 16h1v1H8z" />
        {todo.length > 0 ? <Path fill={c('#A9C2D6')} d={todo.join(' ')} /> : null}
        {done.length > 0 ? <Path fill={tone === 'night' ? '#8FC0EA' : '#2F6FA8'} d={done.join(' ')} /> : null}
        <G transform={`translate(${dx}, ${dy})`}>
          <Anim name="pxBob" dur={1000}>
            <Path fill="#C8553D" d="M66 3h5v1h-5z M64 3h1v2h-1z" />
            <Path fill="#F2EBD8" d="M64 5h7v1h-7z" />
            <Path fill="#C8553D" d="M64 6h7v1h-7z" />
            <Path fill="#9E3F2C" d="M66 7h5v1h-5z" />
            <Path fill="#8C6A55" d="M71 5h1v2h-1z" />
            <Path fill="#3B2A20" d="M72 4h1v4h-1z" />
            <Path fill="#FFFFFF" d="M60 5h3v1h-3z M61 7h2v1h-2z" />
          </Anim>
        </G>
      </Svg>
    </View>
  );
}
