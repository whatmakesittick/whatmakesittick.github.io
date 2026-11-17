import { ODORANT_IDS } from '../ids';
import type { FlavorId, FoodId, NoteId, OdorantId, OdorantLevels, RecipeId, SmellId } from '../ids';

export const FRUIT_DROPS: Readonly<OdorantLevels> = {
  benzaldehyde: 6,
  hexenal: 3,
  linalool: 2,
  eugenol: 1,
  ionone: 1,
};

export const SWEETS_DROPS: Readonly<OdorantLevels> = {
  benzaldehyde: 8,
  hexenal: 0,
  linalool: 0,
  eugenol: 1,
  ionone: 1,
};

export const CLEAR_DROPS: Readonly<OdorantLevels> = {
  benzaldehyde: 0,
  hexenal: 0,
  linalool: 0,
  eugenol: 0,
  ionone: 0,
};

export const DESK_RECIPES: Readonly<Record<RecipeId, Readonly<OdorantLevels>>> = {
  fruit: FRUIT_DROPS,
  sweets: SWEETS_DROPS,
  clear: CLEAR_DROPS,
};

export const DESK_START: Readonly<OdorantLevels> = { ...CLEAR_DROPS, benzaldehyde: 6 };

export const DROPS_RANGE = { min: 0, max: 10, step: 1 } as const;

export const FULL_BOTTLE_DROPS = 13;

const SWEETS_TOTAL_DROPS = 10;

export const MATCH_FLOOR = 0.9;

export const ODORANT_NOTE: Readonly<Record<OdorantId, NoteId>> = {
  benzaldehyde: 'almond',
  hexenal: 'green',
  linalool: 'floral',
  eugenol: 'clove',
  ionone: 'violet',
};

export function emptyLevels(): OdorantLevels {
  return { ...CLEAR_DROPS };
}

function scaled(levels: Readonly<OdorantLevels>, divisor: number): OdorantLevels {
  const out = emptyLevels();
  ODORANT_IDS.forEach((id) => {
    out[id] = levels[id] / divisor;
  });
  return out;
}

export const FOOD_PROFILES: Readonly<Record<FoodId, Readonly<OdorantLevels>>> = {
  cherry: scaled(FRUIT_DROPS, FULL_BOTTLE_DROPS),
  sweets: scaled(SWEETS_DROPS, SWEETS_TOTAL_DROPS),
  marzipan: { ...CLEAR_DROPS, benzaldehyde: 1 },
};

export function profileOf(flavor: FlavorId, desk: Readonly<OdorantLevels>): OdorantLevels {
  if (flavor === 'desk') return scaled(desk, FULL_BOTTLE_DROPS);
  return { ...FOOD_PROFILES[flavor] };
}

export const SOUR: Readonly<Record<FlavorId, number>> = {
  cherry: 0.35,
  sweets: 0,
  marzipan: 0,
  desk: 0,
};

function dot(a: Readonly<OdorantLevels>, b: Readonly<OdorantLevels>): number {
  return ODORANT_IDS.reduce((sum, id) => sum + a[id] * b[id], 0);
}

function length(levels: Readonly<OdorantLevels>): number {
  return Math.sqrt(dot(levels, levels));
}

export function cosine(a: Readonly<OdorantLevels>, b: Readonly<OdorantLevels>): number {
  const product = length(a) * length(b);
  return product === 0 ? 0 : dot(a, b) / product;
}

export function totalDrops(drops: Readonly<OdorantLevels>): number {
  return ODORANT_IDS.reduce((sum, id) => sum + drops[id], 0);
}

const REFERENCE_SMELLS: readonly FoodId[] = ['cherry', 'sweets', 'marzipan'];

export function closestSmell(drops: Readonly<OdorantLevels>): SmellId {
  if (totalDrops(drops) === 0) return 'empty';
  const scored = REFERENCE_SMELLS.map((id) => ({ id, score: cosine(drops, FOOD_PROFILES[id]) }));
  const best = scored.reduce((top, next) => (next.score > top.score ? next : top));
  return best.score >= MATCH_FLOOR ? best.id : 'new';
}

export function cherryMatch(drops: Readonly<OdorantLevels>): number {
  return cosine(drops, FRUIT_DROPS);
}

function sameDrops(a: Readonly<OdorantLevels>, b: Readonly<OdorantLevels>): boolean {
  return ODORANT_IDS.every((id) => a[id] === b[id]);
}

export function recipeOf(drops: Readonly<OdorantLevels>): RecipeId | null {
  const ids = Object.keys(DESK_RECIPES) as RecipeId[];
  return ids.find((id) => sameDrops(DESK_RECIPES[id], drops)) ?? null;
}
