import { RIDGE_CREST_X, clamp, smoothstep } from '../model';
import { METRES_PER_UNIT, TERRAIN } from './constants';

const WINDWARD_CURVE = 1.2;
const LEE_CURVE = 1.4;
const HILL_TEXTURE = { base: 0.6, swing: 0.4, depthRatio: 1.7 } as const;
const FULL_TURN = Math.PI * 2;

export const CREST_HEIGHT = TERRAIN.crestHeight / METRES_PER_UNIT;

export function ridgeShare(x: number): number {
  const offset = x - RIDGE_CREST_X;
  if (offset <= 0) return clamp(1 + offset / TERRAIN.windwardRun, 0, 1) ** WINDWARD_CURVE;
  return clamp(1 - offset / TERRAIN.leeRun, 0, 1) ** LEE_CURVE;
}

function crestHeight(z: number): number {
  const wobble =
    1 + TERRAIN.crestWobble * Math.sin((FULL_TURN * z) / TERRAIN.crestWobbleWavelength);
  const beyond = Math.abs(z) - TERRAIN.ridgeHalfLength;
  return CREST_HEIGHT * wobble * (1 - smoothstep(beyond / TERRAIN.ridgeFade));
}

function hillHeight(x: number, z: number): number {
  const edge = Math.min(TERRAIN.halfWidth - Math.abs(x), TERRAIN.halfDepth - Math.abs(z));
  if (edge <= 0 || edge >= TERRAIN.hillMargin) return 0;
  const texture =
    HILL_TEXTURE.base +
    HILL_TEXTURE.swing *
      Math.sin(x / TERRAIN.hillWavelength) *
      Math.sin(z / (TERRAIN.hillWavelength * HILL_TEXTURE.depthRatio));
  return TERRAIN.hillHeight * Math.sin((Math.PI * edge) / TERRAIN.hillMargin) * texture;
}

export function terrainHeight(x: number, z: number): number {
  return Math.max(ridgeShare(x) * crestHeight(z), hillHeight(x, z));
}
