import Svg, { Path } from 'react-native-svg';

/** A glass jar on the store shelf, filled with coins to show a share of your money. */
export function Jar({ share, sprout, night }: { share: number; sprout?: boolean; night?: boolean }) {
  const rows = share <= 0 ? 0 : Math.max(1, Math.round(share * 14));
  const top = 20 - rows;
  const stripes = [19, 16, 13, 10, 7].filter((y) => y >= top && y < 20);
  return (
    <Svg width={54} height={66} viewBox="0 0 18 22">
      <Path fill="#A86E3E" d="M5 0h8v1H5z M4 1h10v2H4z" />
      <Path fill="#C98B52" d="M4 1h10v1H4z" />
      <Path fill="#5A3420" d="M4 3h10v1H4z M2 4h14v1h1v15h-1v1H2v-1H1V5h1z" />
      <Path fill={night ? '#3A4A50' : '#E3F0F5'} d="M2 5h14v15H2z" />
      {rows > 0 ? <Path fill="#E8B23A" d={`M2 ${top}h14v${rows}H2z`} /> : null}
      {stripes.length > 0 ? <Path fill="#C99528" d={stripes.map((y) => `M2 ${y}h14v1H2z`).join(' ')} /> : null}
      {rows > 2 ? <Path fill="#FFE59A" d={`M4 ${top + 1}h2v1H4z M10 ${Math.min(19, top + 3)}h2v1h-2z`} /> : null}
      {sprout ? (
        <>
          <Path fill="#4E8B3E" d={`M9 ${Math.max(6, top - 5)}h1v${Math.min(5, top - Math.max(6, top - 5))}H9z`} />
          <Path fill="#6FAE52" d={`M7 ${Math.max(5, top - 6)}h2v1H7z M8 ${Math.max(6, top - 5)}h1v1H8z`} />
          <Path fill="#8CC56E" d={`M10 ${Math.max(4, top - 7)}h2v1h-2z M10 ${Math.max(5, top - 6)}h1v1h-1z`} />
        </>
      ) : null}
      <Path fill="#FFFFFF" d="M3 6h1v3H3z M14 6h1v2h-1z" />
    </Svg>
  );
}
