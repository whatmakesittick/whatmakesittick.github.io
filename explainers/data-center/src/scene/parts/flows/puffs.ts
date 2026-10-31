import type { Texture } from 'three';
import type { EmphasisGroup, PartContext } from '../context';
import { PUFF_STOPS, RENDER_ORDER } from './constants';
import { Cloud, gradientTexture } from './points';

const GOLDEN = 0.618034;

export function seeded(index: number): number {
  return (index * GOLDEN) % 1;
}

export function lifeOf(index: number, slots: number, clock: number): number {
  const slot = index % slots;
  return (((slot / slots + seeded(index) * 0.35 + clock) % 1) + 1) % 1;
}

const puffTextures = new WeakMap<PartContext, Texture>();

function puffTexture(context: PartContext): Texture {
  const known = puffTextures.get(context);
  if (known) return known;
  const texture = gradientTexture(context, PUFF_STOPS);
  puffTextures.set(context, texture);
  return texture;
}

export function puffCloud(context: PartContext, group: EmphasisGroup, count: number): Cloud {
  return new Cloud(context, group, count, {
    texture: puffTexture(context),
    size: 1,
    worldSize: true,
    sized: true,
    pull: false,
    renderOrder: RENDER_ORDER.puffs,
  });
}
