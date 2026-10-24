import type { TintName } from '../theme/palette';
import { SPRITES, type SpriteDef } from './designSprites';
import { EXTRA_SPRITES } from './extraSprites';

export type { Layer, SpriteDef } from './designSprites';

export const ALL_SPRITES = { ...SPRITES, ...EXTRA_SPRITES };
export type SpriteName = keyof typeof ALL_SPRITES;

export function getSprite(name: string): SpriteDef {
  return (ALL_SPRITES as Record<string, SpriteDef>)[name] ?? ALL_SPRITES.sparkle;
}

/** Background tint for each item sprite when it sits in a tile. */
const TINTS: Record<string, TintName> = {
  bank: 'cream',
  chest: 'orange',
  sprout: 'green',
  pouch: 'cream',
  coin: 'gold',
  piggy: 'pink',
  house: 'orange',
  onigiri: 'gold',
  tram: 'blue',
  basket: 'green',
  lantern: 'orange',
  bag: 'cream',
  funTicket: 'pink',
  cross: 'pink',
  book: 'green',
  paw: 'cream',
  gift: 'pink',
  sparkle: 'gold',
  plane: 'blue',
  planeTeal: 'teal',
  star: 'gold',
  hotel: 'cream',
  ticket: 'pink',
  card: 'blue',
  cardOrange: 'orange',
  car: 'orange',
  letter: 'pink',
  scroll: 'cream',
  receipt: 'gold',
  hourglass: 'gold',
};

export function tintOf(name: string): TintName {
  return TINTS[name] ?? 'cream';
}

export const ACCOUNT_ICONS = ['bank', 'chest', 'sprout', 'pouch', 'coin', 'piggy', 'house'] as const;
export const CATEGORY_ICONS = [
  'onigiri',
  'tram',
  'basket',
  'lantern',
  'bag',
  'funTicket',
  'house',
  'cross',
  'book',
  'paw',
  'gift',
  'plane',
  'car',
  'sparkle',
] as const;
export const PROGRAM_ICONS = ['plane', 'planeTeal', 'star', 'hotel', 'ticket'] as const;
export const LIABILITY_ICONS = ['card', 'cardOrange', 'car', 'house', 'letter', 'scroll', 'book'] as const;
