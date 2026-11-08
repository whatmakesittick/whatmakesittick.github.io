import type { Mesh } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { FINISHES } from '../../finishes';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { capGeometry } from './geometry';
import type { Rect } from './geometry';

export function sectionCap(context: PartContext, rects: readonly Rect[], name: string): Mesh {
  const mesh = partMesh(context, capGeometry(rects), STRUCTURE_GROUP, FINISHES.section);
  mesh.name = name;
  mesh.visible = false;
  return mesh;
}
