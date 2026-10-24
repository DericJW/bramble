/**
 * Colours from the approved pixel countryside design: a warm parchment day and a
 * lamplit night. Every screen reads its colours from here.
 */

export type TintName = 'green' | 'blue' | 'gold' | 'orange' | 'cream' | 'pink' | 'teal';

export type Palette = {
  night: boolean;
  /** Page background and its 3px checker dither. */
  page: string;
  dither: string;
  /** Text and pixel outlines. */
  ink: string;
  border: string;
  muted: string;
  faint: string;
  /** Cards. */
  card: string;
  cardInset: string;
  drop: string;
  dash: string;
  track: string;
  /** Titles drawn over the illustrated header. */
  sceneText: string;
  sceneShadow: string;
  /** Meaningful colours. */
  good: string;
  leaf: string;
  link: string;
  warn: string;
  warnStrong: string;
  warnBg: string;
  warnEdge: string;
  blue: string;
  blueDeep: string;
  gold: string;
  tint: Record<TintName, string>;
  /** Wooden planks (net worth and budget cards). */
  wood: string;
  woodSeam: string;
  woodHi: string;
  woodLabel: string;
  woodNum: string;
  woodValue: string;
  woodGood: string;
  woodDash: string;
  rivet: string;
  rivetShadow: string;
  /** Bottom tab bar. */
  tab: string;
  tabSeam: string;
  tabHi: string;
  tabActiveBox: string;
  tabActiveIcon: string;
  tabActiveLabel: string;
  tabIdle: string;
  /** Main green button. */
  btn: string;
  btnText: string;
  btnHi: string;
  btnLo: string;
  /** Floating add button. */
  fab: string;
  fabIcon: string;
  fabHi: string;
  fabLo: string;
  /** Soft drop under buttons. */
  shadow: string;
  keyInset: string;
  chipOn: string;
  chipOnText: string;
  /** Dimmed backdrop behind sheets. */
  scrim: string;
  /** Bars. */
  barGood: string;
  barGoodDark: string;
  barGoodHi: string;
  barWarn: string;
  barWarnDark: string;
  barGold: string;
  barGoldDark: string;
  barGoldHi: string;
};

export const DAY: Palette = {
  night: false,
  page: '#EEDFBD',
  dither: '#E6D5AE',
  ink: '#3B2A20',
  border: '#3B2A20',
  muted: '#6E5A48',
  faint: '#8C7A66',
  card: '#FFF8E6',
  cardInset: '#F3E6C6',
  drop: '#C9B48A',
  dash: '#E2D0A4',
  track: '#E6D5AE',
  sceneText: '#3B2A20',
  sceneShadow: '#FFFDF5',
  good: '#346B34',
  leaf: '#5E9C4E',
  link: '#346B34',
  warn: '#A0401F',
  warnStrong: '#8A3418',
  warnBg: '#F6DCCB',
  warnEdge: '#E2B49A',
  blue: '#2F6FA8',
  blueDeep: '#1F4F7E',
  gold: '#8A5F0E',
  tint: {
    green: '#DDEBC8',
    blue: '#D6E8F3',
    gold: '#F7E6B8',
    orange: '#F6DCCB',
    cream: '#F3E6C6',
    pink: '#F9DDE6',
    teal: '#D6EEEC',
  },
  wood: '#7A4A2A',
  woodSeam: '#66391F',
  woodHi: '#9A6440',
  woodLabel: '#F3DDB0',
  woodNum: '#FFD66B',
  woodValue: '#FFF3D6',
  woodGood: '#B9E39A',
  woodDash: '#B98A5E',
  rivet: '#D9B77A',
  rivetShadow: '#4A2C18',
  tab: '#7A4A2A',
  tabSeam: '#66391F',
  tabHi: '#9A6440',
  tabActiveBox: '#FFF3D6',
  tabActiveIcon: '#3B2A20',
  tabActiveLabel: '#FFD66B',
  tabIdle: '#F3DDB0',
  btn: '#3E7B3E',
  btnText: '#FFF8E6',
  btnHi: '#5E9C4E',
  btnLo: '#2F5E30',
  fab: '#3E7B3E',
  fabIcon: '#FFF8E6',
  fabHi: '#5E9C4E',
  fabLo: '#2F5E30',
  shadow: 'rgba(59,42,30,0.33)',
  keyInset: '#E2D0A4',
  chipOn: '#3B2A20',
  chipOnText: '#FFF8E6',
  scrim: 'rgba(42,26,16,0.55)',
  barGood: '#6FAE52',
  barGoodDark: '#4E8B3E',
  barGoodHi: '#9BD27E',
  barWarn: '#E07A4A',
  barWarnDark: '#B0482A',
  barGold: '#E8B23A',
  barGoldDark: '#C99528',
  barGoldHi: '#F4CF6A',
};

export const NIGHT: Palette = {
  night: true,
  page: '#1F231E',
  dither: '#252A24',
  ink: '#F3E3C3',
  border: '#0E0B09',
  muted: '#BFAE92',
  faint: '#9C8C74',
  card: '#2C2822',
  cardInset: '#3A342C',
  drop: 'rgba(0,0,0,0.5)',
  dash: '#3D372F',
  track: '#3D372F',
  sceneText: '#F3E3C3',
  sceneShadow: '#0E0B09',
  good: '#9BD27E',
  leaf: '#7FBF63',
  link: '#9BD27E',
  warn: '#F0A07A',
  warnStrong: '#F0A07A',
  warnBg: '#44291F',
  warnEdge: '#6A3A28',
  blue: '#8FC0EA',
  blueDeep: '#BBD9F2',
  gold: '#FFD66B',
  tint: {
    green: '#2E3F2A',
    blue: '#233344',
    gold: '#40341A',
    orange: '#44291F',
    cream: '#3A342C',
    pink: '#3E2A33',
    teal: '#1F3A38',
  },
  wood: '#4A2E1C',
  woodSeam: '#3E2617',
  woodHi: '#5E3A24',
  woodLabel: '#E3C99A',
  woodNum: '#FFD66B',
  woodValue: '#FFF3D6',
  woodGood: '#B9E39A',
  woodDash: '#8A6440',
  rivet: '#B8975E',
  rivetShadow: '#1E120A',
  tab: '#3A2416',
  tabSeam: '#2F1C10',
  tabHi: '#5A3824',
  tabActiveBox: '#F3E3C3',
  tabActiveIcon: '#2A1A10',
  tabActiveLabel: '#FFD66B',
  tabIdle: '#E3C99A',
  btn: '#3E7B3E',
  btnText: '#FFF8E6',
  btnHi: '#5E9C4E',
  btnLo: '#2F5E30',
  fab: '#E8B23A',
  fabIcon: '#2A1A10',
  fabHi: '#F4CF6A',
  fabLo: '#C99528',
  shadow: 'rgba(0,0,0,0.5)',
  keyInset: '#3D372F',
  chipOn: '#F3E3C3',
  chipOnText: '#2A1A10',
  scrim: 'rgba(0,0,0,0.6)',
  barGood: '#6FAE52',
  barGoodDark: '#4E8B3E',
  barGoodHi: '#9BD27E',
  barWarn: '#E07A4A',
  barWarnDark: '#B0482A',
  barGold: '#E8B23A',
  barGoldDark: '#C99528',
  barGoldHi: '#F4CF6A',
};
