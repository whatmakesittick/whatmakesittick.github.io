import { Vector2 } from 'three';
import type { Mesh } from 'three';
import type { SectionProfile } from '../geometry/profiles';
import { alongCutPosition } from '../layout';
import { BLOCK } from '../constants';
import { paintSurfaces, staticPrism } from '../geometry/prism';
import { SURFACE_COLORS } from '../finishes';
import { castingMesh, cutNormalOf, partMesh } from './context';
import type { PartContext } from './context';

function blockProfile(context: PartContext): SectionProfile {
  const { layout, dims } = context;
  const along = layout.sectionHalfAlong;
  const depth = layout.sectionHalfDepth;
  return {
    boundary: [
      new Vector2(-along, 0),
      new Vector2(-along, depth),
      new Vector2(along, depth),
      new Vector2(along, 0),
    ],
    openings: layout.cylinders.map((placement) => ({
      center: alongCutPosition(layout, placement.z),
      radius: dims.linerOuterRadius,
    })),
  };
}

export function createBlock(context: PartContext): Mesh {
  const mesh = castingMesh(context, blockProfile(context), context.layout.sectionFrame, 0, 1);
  if (!mesh) throw new Error('Block section is empty');
  return mesh;
}

export function createHeadGasket(context: PartContext): Mesh {
  const cutNormal = cutNormalOf(context);
  const geometry = staticPrism(blockProfile(context), context.layout.sectionFrame, 0, 1, cutNormal);
  if (!geometry) throw new Error('Gasket section is empty');
  paintSurfaces(geometry, SURFACE_COLORS.gasket, SURFACE_COLORS.gasket, cutNormal);
  const mesh = partMesh(context, geometry, 'structure', 'gasket');
  mesh.scale.y = BLOCK.gasketThickness;
  return mesh;
}
