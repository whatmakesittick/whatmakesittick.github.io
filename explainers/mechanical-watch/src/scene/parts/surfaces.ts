import type { CanvasTexture, Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import { FINISHES } from '../finishes';
import { circularGraining, dialFace, genevaStripes, perlage, sunburst } from './canvasTextures';

export interface Surfaces {
  readonly plate: MaterialFinish;
  readonly bridge: MaterialFinish;
  readonly bevel: MaterialFinish;
  readonly dial: MaterialFinish;
  grained(radius: number, finish?: MaterialFinish): MaterialFinish;
  sunray(radius: number, finish?: MaterialFinish): MaterialFinish;
}

const STRIPE_WIDTH_MM = 1.7;
const STRIPE_ANGLE = Math.PI / 3;
const PERLAGE_TILE_MM = 3.0;
const DIAL_ROUGHNESS = 0.5;
const PLATE_ROUGHNESS = 0.4;
const BRIDGE_ROUGHNESS = 0.3;
const DIAL_BASE = '#ffffff';

function tiled(texture: CanvasTexture, tileMm: number, rotation = 0): CanvasTexture {
  texture.repeat.set(1 / tileMm, 1 / tileMm);
  texture.rotation = rotation;
  return texture;
}

function centred(source: Texture, radius: number): Texture {
  const texture = source.clone();
  texture.repeat.set(1 / (radius * 2), 1 / (radius * 2));
  texture.offset.set(0.5, 0.5);
  texture.needsUpdate = true;
  return texture;
}

class RadialFinishes {
  private readonly cache = new Map<string, MaterialFinish>();
  private readonly tracker: ResourceTracker;
  private readonly source: Texture;

  constructor(tracker: ResourceTracker, source: Texture) {
    this.tracker = tracker;
    this.source = source;
  }

  finish(radius: number, base: MaterialFinish): MaterialFinish {
    const key = `${radius}:${String(base.color)}`;
    let finish = this.cache.get(key);
    if (!finish) {
      finish = { ...base, map: this.tracker.track(centred(this.source, radius)) };
      this.cache.set(key, finish);
    }
    return finish;
  }
}

export function createSurfaces(tracker: ResourceTracker): Surfaces {
  const stripes = tracker.track(tiled(genevaStripes(), STRIPE_WIDTH_MM, STRIPE_ANGLE));
  const pearls = tracker.track(tiled(perlage(), PERLAGE_TILE_MM));
  const face = tracker.track(dialFace());
  const graining = new RadialFinishes(tracker, tracker.track(circularGraining()));
  const rays = new RadialFinishes(tracker, tracker.track(sunburst()));
  return {
    plate: { ...FINISHES.plate, map: pearls, roughness: PLATE_ROUGHNESS },
    bridge: { ...FINISHES.plate, map: stripes, roughness: BRIDGE_ROUGHNESS },
    bevel: FINISHES.polishedBrass,
    dial: { color: DIAL_BASE, map: face, metalness: 0.05, roughness: DIAL_ROUGHNESS },
    grained: (radius, finish = FINISHES.brass) => graining.finish(radius, finish),
    sunray: (radius, finish = FINISHES.steel) => rays.finish(radius, finish),
  };
}
