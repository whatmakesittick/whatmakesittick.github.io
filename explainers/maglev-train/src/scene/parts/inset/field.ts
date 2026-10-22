import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { LAYER, OPACITY } from './constants';
import { patternStrip } from './insetMesh';
import type { InsetPart } from './insetMesh';
import { STATOR_DRAWING } from './layout';
import { fieldSpillTexture, fieldTexture } from './textures';

const SPILL_HEIGHT = 0.1;

export const FIELD_NAME = 'gapInsetField';

export function fieldBands(context: PartContext): InsetPart<[offset: number, strength: number]> {
  const { top, bottom } = STATOR_DRAWING;
  const maps = [fieldTexture(), fieldSpillTexture()].map((map) => context.tracker.track(map));
  const spans = [
    [top, bottom],
    [bottom, bottom - SPILL_HEIGHT],
  ] as const;
  const meshes = maps.map((map, index) =>
    patternStrip(context, map, spans[index], LAYER.field, OPACITY.field),
  );
  const group = namedGroup(FIELD_NAME);
  group.add(...meshes);
  return {
    group,
    draw(offset, strength) {
      maps.forEach((map) => (map.offset.x = offset));
      group.visible = strength > 0;
      meshes.forEach((mesh) => (mesh.material.opacity = OPACITY.field * strength));
    },
  };
}
