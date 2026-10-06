import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { ISOCENTRE } from '../../../model/layout';
import type { Arc } from '../../geometry/sweep';
import { FULL_TURN } from '../../geometry/sweep';
import { partMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

const WEDGE_CENTRE = Math.PI / 4;
const WEDGE_SPAN = (2 * Math.PI) / 3;

export const WEDGE_ARC: Arc = {
  start: WEDGE_CENTRE - WEDGE_SPAN / 2,
  end: WEDGE_CENTRE + WEDGE_SPAN / 2,
};
export const REST_ARC: Arc = { start: WEDGE_ARC.end, end: WEDGE_ARC.start + FULL_TURN };
export const FULL_ARC: Arc = { start: 0, end: FULL_TURN };

export function isInWedge(angle: number): boolean {
  const offset = Math.atan2(Math.sin(angle - WEDGE_CENTRE), Math.cos(angle - WEDGE_CENTRE));
  return Math.abs(offset) <= WEDGE_SPAN / 2;
}

export function boreGroup(name: string): Group {
  const group = new Group();
  group.name = name;
  group.position.set(0, ISOCENTRE[1], 0);
  return group;
}

export function addMeshes(
  context: PartContext,
  parent: Object3D,
  group: EmphasisGroup,
  finish: MaterialFinish,
  geometries: readonly BufferGeometry[],
): void {
  geometries.forEach((geometry) => parent.add(partMesh(context, geometry, group, finish)));
}
