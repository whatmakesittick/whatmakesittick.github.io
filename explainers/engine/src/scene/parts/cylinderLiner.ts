import { Vector2 } from 'three';
import type { Mesh } from 'three';
import { SURFACE_COLORS } from '../finishes';
import { paintSurfaces, staticPrism } from '../geometry/prism';
import { arcPoints } from '../geometry/profiles';
import type { SectionProfile } from '../geometry/profiles';
import { cutNormalOf, sharedMesh } from './context';
import type { PartContext } from './context';

function linerProfile(context: PartContext): SectionProfile {
  const { linerOuterRadius, boreRadius } = context.dims;
  return {
    boundary: arcPoints(new Vector2(0, 0), linerOuterRadius, Math.PI, 0),
    openings: [{ center: 0, radius: boreRadius }],
  };
}

export function linerFactory(context: PartContext): (z: number) => Mesh {
  const cutNormal = cutNormalOf(context);
  const geometry = staticPrism(linerProfile(context), context.layout.sectionFrame, 0, 1, cutNormal);
  if (!geometry) throw new Error('Liner section is empty');
  paintSurfaces(geometry, SURFACE_COLORS.liner, SURFACE_COLORS.cut, cutNormal);
  context.tracker.track(geometry);
  return (z) => {
    const mesh = sharedMesh(context, geometry, 'cylinder', 'liner');
    mesh.position.z = z;
    return mesh;
  };
}
