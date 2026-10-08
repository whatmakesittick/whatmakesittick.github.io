import { BufferAttribute, CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { smoothstep } from '@core/math';
import { ROTOR_DIAMETER_M, ROTOR_RADIUS_M, WAKE_DECAY } from '../../../model';
import { PLUME } from './constants';

const QUARTER_TURN = Math.PI / 2;
const RGBA = 4;
const UV = 2;

export function plumeRadius(distance: number): number {
  return ROTOR_RADIUS_M + WAKE_DECAY * distance;
}

export function plumeAlpha(distance: number, length: number): number {
  const fadeIn = smoothstep(distance, 0, PLUME.fadeInD * ROTOR_DIAMETER_M);
  const fadeOut = 1 - smoothstep(distance, length * PLUME.fadeOutFrom, length);
  return fadeIn * fadeOut;
}

export function plumeGeometry(length: number): BufferGeometry {
  const geometry = new CylinderGeometry(
    plumeRadius(length),
    plumeRadius(0),
    length,
    PLUME.radialSegments,
    PLUME.lengthSegments,
    true,
  )
    .rotateZ(-QUARTER_TURN)
    .translate(length / 2, 0, 0);
  const position = geometry.getAttribute('position');
  const around = geometry.getAttribute('uv');
  const colours = new Float32Array(position.count * RGBA);
  const uvs = new Float32Array(position.count * UV);
  for (let index = 0; index < position.count; index += 1) {
    const distance = position.getX(index);
    colours.set([1, 1, 1, plumeAlpha(distance, length)], index * RGBA);
    uvs.set([distance / PLUME.streakPeriod, around.getX(index) * PLUME.streakBands], index * UV);
  }
  geometry.setAttribute('color', new BufferAttribute(colours, RGBA));
  geometry.setAttribute('uv', new BufferAttribute(uvs, UV));
  return geometry;
}
