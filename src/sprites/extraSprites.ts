// Extra pixel sprites drawn for the app in the same style as the design: more spending
// pouch icons, a hotel for hotel points, and a few interface icons.
import type { SpriteDef } from './designSprites';

export const EXTRA_SPRITES = {
  house: {
    w: 12,
    h: 12,
    layers: [
      ['#C8553D', 'M5 1h2v1h1v1h1v1h1v1h1v1H1V5h1V4h1V3h1V2h1z'],
      ['#E07A5F', 'M5 1h1v1H5z M4 2h1v1H4z M3 3h1v1H3z M2 4h1v1H2z'],
      ['#9E3F2C', 'M1 5h10v1H1z'],
      ['#3B2A20', 'M2 6h8v6H2z'],
      ['#F3E3C3', 'M3 6h6v5H3z'],
      ['#8FC8E8', 'M3 7h1v1H3z M8 7h1v1H8z'],
      ['#8E5A35', 'M5 8h2v3H5z'],
    ],
  },
  cross: {
    w: 12,
    h: 12,
    layers: [
      ['#3B2A20', 'M4 1h4v3h3v4H8v3H4V8H1V4h3z'],
      ['#E25A45', 'M5 2h2v3h3v2H7v3H5V7H2V5h3z'],
      ['#F07A6A', 'M5 2h1v1H5z M2 5h1v1H2z'],
    ],
  },
  book: {
    w: 12,
    h: 12,
    layers: [
      ['#3B2A20', 'M2 1h8v10H2z'],
      ['#4E8B3E', 'M3 2h6v7H3z'],
      ['#2F5E30', 'M3 2h1v7H3z'],
      ['#F3E3C3', 'M3 9h6v1H3z'],
      ['#FFD66B', 'M5 4h3v1H5z'],
    ],
  },
  paw: {
    w: 12,
    h: 12,
    layers: [
      ['#8E5A35', 'M2 3h2v2H2z M5 1h2v2H5z M8 3h2v2H8z M3 6h6v1h1v3H9v1H3v-1H2V7h1z'],
      ['#C98B52', 'M3 7h2v1H3z M5 1h1v1H5z M2 3h1v1H2z M8 3h1v1H8z'],
    ],
  },
  gift: {
    w: 12,
    h: 12,
    layers: [
      ['#3B2A20', 'M1 4h10v8H1z'],
      ['#D9473A', 'M2 6h8v5H2z'],
      ['#E25A45', 'M2 4h8v2H2z'],
      ['#FFD66B', 'M5 4h2v7H5z M2 6h8v1H2z M3 2h2v2H3z M7 2h2v2H7z'],
      ['#E8B23A', 'M4 3h1v1H4z M7 3h1v1H7z'],
    ],
  },
  sparkle: {
    w: 12,
    h: 12,
    layers: [
      ['#E8B23A', 'M5 1h2v3h1v1h3v2H8v1H7v3H5V8H4V7H1V5h3V4h1z'],
      ['#FFE59A', 'M5 2h1v3H5z M2 5h3v1H2z'],
      ['#C99528', 'M7 6h1v1H7z M6 7h1v3H6z'],
    ],
  },
  hotel: {
    w: 12,
    h: 12,
    layers: [
      ['#3B2A20', 'M2 1h8v11H2z'],
      ['#C98B52', 'M3 2h6v9H3z'],
      ['#FFE59A', 'M4 3h1v1H4z M7 3h1v1H7z M4 5h1v1H4z M7 5h1v1H7z'],
      ['#5A3420', 'M5 8h2v3H5z'],
      ['#D9473A', 'M3 7h6v1H3z'],
    ],
  },
  piggy: {
    w: 12,
    h: 12,
    layers: [
      ['#3B2A20', 'M3 3h6v1h1v1h1v4h-1v1H9v2H7v-2H5v2H3v-2H2V9H1V5h1V4h1z'],
      ['#F2A6B8', 'M3 4h6v1h1v4H9v1H3V9H2V5h1z'],
      ['#E07A9A', 'M3 8h6v1H3z M10 6h1v2h-1z'],
      ['#2A1A10', 'M8 5h1v1H8z'],
      ['#FFD66B', 'M5 3h2v1H5z'],
    ],
  },
  /* Interface icons (drawn in whatever colour they are given). */
  iGear: {
    w: 12,
    h: 12,
    layers: [
      [
        'currentColor',
        'M5 0h2v2H5z M5 10h2v2H5z M0 5h2v2H0z M10 5h2v2h-2z M1 1h2v2H1z M9 1h2v2H9z M1 9h2v2H1z M9 9h2v2H9z M3 2h6v1H3z M2 3h8v6H2z M3 9h6v1H3z M5 4h2v1H5z M4 5h4v2H4z M5 7h2v1H5z',
        1,
      ],
    ],
  },
  iTrash: {
    w: 12,
    h: 12,
    layers: [['currentColor', 'M4 0h4v1H4z M1 1h10v2H1z M2 4h8v6H2z M3 10h6v1H3z M4 5h1v4H4z M7 5h1v4H7z', 1]],
  },
  iChevDown: {
    w: 12,
    h: 12,
    layers: [['currentColor', 'M2 3h2v1h1v1h2V4h1V3h2v2H9v1H8v1H7v1H5V7H4V6H3V5H2z']],
  },
  iMinus: {
    w: 12,
    h: 12,
    layers: [['currentColor', 'M2 5h8v2H2z']],
  },
  iEdit: {
    w: 12,
    h: 12,
    layers: [
      [
        'currentColor',
        'M8 1h2v1h1v2h-1v1H9V4H8V3H7V2h1z M6 3h1v1h1v1h1v1H8v1H7v1H6v1H5v1H4V9H3V8H2V7h1V6h1V5h1V4h1z M1 9h1v1h1v1h1v1H1z',
      ],
    ],
  },
  iDoor: {
    w: 12,
    h: 12,
    layers: [['currentColor', 'M2 1h6v10H2z M3 2h4v8H3z M5 6h1v1H5z M9 5h1v-1h1v1h1v2h-1v1h-1V7H8V5z', 1]],
  },
  iCalendar: {
    w: 12,
    h: 12,
    layers: [['currentColor', 'M3 0h1v2H3z M8 0h1v2H8z M1 2h10v9H1z M2 5h8v5H2z M3 6h1v1H3z M5 6h1v1H5z M7 6h1v1H7z M3 8h1v1H3z M5 8h1v1H5z', 1]],
  },
} as const satisfies Record<string, SpriteDef>;
