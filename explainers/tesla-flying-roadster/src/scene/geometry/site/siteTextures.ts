import type { DataTexture } from 'three';
import type { ResourceTracker } from '@core/scene/resources';
import { BUSH_CARD_RECIPE, TREE_CARD_RECIPE } from './cards';
import { CONCRETE_GRIT_RECIPE, CONCRETE_RECIPE } from './concrete';
import { DECK_RECIPE, DECK_TREAD_RECIPE } from './deckPlate';
import { WORN_PAINT_RECIPE } from './markings';
import { SCRUB_RECIPE } from './scrub';
import { recipePixels, recipeTexture } from './textures';
import type { TextureRecipe } from './textures';
import { TRACK_RECIPE } from './tracks';

export const SITE_RECIPES = {
  scrub: SCRUB_RECIPE,
  bushCards: BUSH_CARD_RECIPE,
  treeCards: TREE_CARD_RECIPE,
  tracks: TRACK_RECIPE,
  concrete: CONCRETE_RECIPE,
  concreteGrit: CONCRETE_GRIT_RECIPE,
  wornPaint: WORN_PAINT_RECIPE,
  deck: DECK_RECIPE,
  deckTread: DECK_TREAD_RECIPE,
} as const satisfies Record<string, TextureRecipe>;

export type SiteTextureId = keyof typeof SITE_RECIPES;
export type SitePixels = Record<SiteTextureId, Uint8Array>;

export const SITE_TEXTURE_IDS = Object.keys(SITE_RECIPES) as SiteTextureId[];

export type SiteTextures = Record<SiteTextureId, DataTexture>;

export function paintSiteTexture(id: SiteTextureId): Uint8Array {
  return recipePixels(SITE_RECIPES[id]);
}

export function siteTextures(pixels: SitePixels, tracker: ResourceTracker): SiteTextures {
  const textures = SITE_TEXTURE_IDS.map((id) => [
    id,
    tracker.track(recipeTexture(SITE_RECIPES[id], pixels[id])),
  ]);
  return Object.fromEntries(textures) as SiteTextures;
}
