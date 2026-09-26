import { Mesh } from 'three';
import type { BufferGeometry, Vector3 } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';
import type { EngineSpec } from '../../model';
import type { EngineDimensions } from '../dimensions';
import { FINISHES, SURFACE_COLORS } from '../finishes';
import type { EmphasisGroup, Finish } from '../finishes';
import { paintSurfaces, staticPrism } from '../geometry/prism';
import type { SectionProfile } from '../geometry/profiles';
import type { Frame, LayoutGeometry } from '../layout';

export interface PartContext {
  spec: EngineSpec;
  dims: EngineDimensions;
  layout: LayoutGeometry;
  cutaway: boolean;
  materials: MaterialLibrary;
  tracker: ResourceTracker;
}

export function partMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish,
): Mesh {
  return new Mesh(context.tracker.track(geometry), context.materials.get(group, FINISHES[finish]));
}

export function sharedMesh(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish,
): Mesh {
  return new Mesh(geometry, context.materials.get(group, FINISHES[finish]));
}

export function stretchVertically(mesh: Mesh, bottom: number, top: number): void {
  mesh.position.y = bottom;
  mesh.scale.y = top - bottom;
}

export function hasOpenFront(context: PartContext): boolean {
  return context.cutaway && context.layout.cutNormal.z > 0;
}

export function cutNormalOf(context: PartContext): Vector3 | null {
  return context.cutaway ? context.layout.cutNormal : null;
}

export function castingMesh(
  context: PartContext,
  profile: SectionProfile,
  frame: Frame,
  start: number,
  end: number,
): Mesh | null {
  const cutNormal = cutNormalOf(context);
  const geometry = staticPrism(profile, frame, start, end, cutNormal);
  if (!geometry) return null;
  paintSurfaces(geometry, SURFACE_COLORS.casting, SURFACE_COLORS.cut, cutNormal);
  return partMesh(context, geometry, 'structure', 'casting');
}
