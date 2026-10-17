import { NormalBlending } from 'three';
import type { Blending, PointsMaterial, Texture } from 'three';
import { createPointMaterial } from '@core/scene/pointCloud';
import { puffTexture } from '../../geometry/effects/puffTexture';
import { registered } from '../context';
import type { PartContext } from '../context';
import { POINT_SIZE_PER_METRE } from './constants';

export const PUFF_SCALE_ATTRIBUTE = 'aScale';

const SIZE_UNIFORM = 'uniform float size;';
const POINT_SIZE = 'gl_PointSize = size;';
const CACHE_KEY = 'scaledPuffs';

export function puffMaterial(
  texture: Texture,
  size: number,
  blending: Blending = NormalBlending,
): PointsMaterial {
  const material = createPointMaterial(texture, size, blending);
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(SIZE_UNIFORM, `${SIZE_UNIFORM}\nattribute float ${PUFF_SCALE_ATTRIBUTE};`)
      .replace(POINT_SIZE, `gl_PointSize = size * ${PUFF_SCALE_ATTRIBUTE};`);
  };
  material.customProgramCacheKey = () => CACHE_KEY;
  return material;
}

export function jetMaterial(context: PartContext): PointsMaterial {
  const texture = context.tracker.track(puffTexture());
  return registered(context, 'jets', puffMaterial(texture, POINT_SIZE_PER_METRE));
}
