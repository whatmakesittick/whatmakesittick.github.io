import { CORRIDOR } from '../constants';
import { grey } from './colour';
import type { Field } from './fields';
import type { Linear } from './linears';
import { fillBox } from './painter';
import type { Painter } from './painter';
import { pondWater } from './paintFields';
import { isWater, waterBox } from './paintLinears';

export const SURFACE_ROUGHNESS = { land: 1, water: 0.56, flooded: 0.86 } as const;

export function paintRoughness(
  painter: Painter,
  fields: readonly Field[],
  linears: readonly Linear[],
): void {
  const { context, width, height, period } = painter;
  context.fillStyle = grey(SURFACE_ROUGHNESS.land);
  context.fillRect(0, 0, width, height);
  const water = grey(SURFACE_ROUGHNESS.water);
  fields.forEach((field) => {
    if (field.kind === 'flooded')
      fillBox(painter, field.x, field.z, grey(SURFACE_ROUGHNESS.flooded));
    if (field.kind !== 'pond') return;
    const inner = pondWater(field);
    fillBox(painter, inner.x, inner.z, water);
  });
  linears.filter(isWater).forEach((linear) => {
    const box = waterBox(linear);
    fillBox(painter, box.x, box.z, water);
  });
  fillBox(painter, [0, period], CORRIDOR.ditch, water);
}
