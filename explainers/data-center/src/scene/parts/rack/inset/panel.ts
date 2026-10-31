import { BoxGeometry, BufferGeometry, CylinderGeometry, Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { CHIP_ANCHOR, INSET, INSET_CENTRE } from '../../../../model';
import { THEME } from '../../../../theme';
import { finishMesh } from '../../context';
import type { PartContext } from '../../context';
import { INSET_PART, LAYER, flatMesh, inkedMesh } from './flat';
import { INK } from './ink';
import { CONTENT_HALF, FRAME, SHOWN_HALF } from './layout';
import { merged, outlines } from './strokes';

const PANEL_FINISH: MaterialFinish = {
  color: THEME.inset,
  emissive: THEME.inset,
  emissiveIntensity: 0.6,
  roughness: 0.9,
};
const LEADER_RADIUS = 0.004;
const LEADER_SIDES = 6;
const SIDES = [-1, 1] as const;
const UP = new Vector3(0, 1, 0);

export function buildPanel(context: PartContext): Object3D[] {
  const body = new BoxGeometry(INSET.width, INSET.height, INSET.depth);
  const half = [INSET.width / 2 - FRAME.inset, INSET.height / 2 - FRAME.inset] as const;
  const frame = outlines([[-half[0], -half[1], half[0], half[1]]], FRAME.width);
  return [
    finishMesh(context, body, INSET_PART, PANEL_FINISH),
    flatMesh(context, frame, INK.frame, LAYER.line),
  ];
}

function panelEnd(side: number): Vector3 {
  const [x, y, z] = INSET_CENTRE;
  return new Vector3(x, y - INSET.height / 2, z + side * CONTENT_HALF);
}

function chipEnd(side: number): Vector3 {
  const [x, y, z] = CHIP_ANCHOR;
  return new Vector3(x, y, z + side * SHOWN_HALF);
}

function tube(from: Vector3, to: Vector3): BufferGeometry {
  const direction = to.clone().sub(from);
  const radius = LEADER_RADIUS;
  const geometry = new CylinderGeometry(radius, radius, direction.length(), LEADER_SIDES, 1, true);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction.normalize()));
  const centre = from
    .clone()
    .add(to)
    .multiplyScalar(1 / 2);
  return geometry.translate(centre.x, centre.y, centre.z);
}

function wedge(): BufferGeometry {
  const [a, b] = SIDES.map(panelEnd);
  const [c, d] = SIDES.map(chipEnd);
  return new BufferGeometry().setFromPoints([a, b, d, a, d, c]);
}

export function buildLeader(context: PartContext): Object3D[] {
  const lines = merged(SIDES.map((side) => tube(panelEnd(side), chipEnd(side))));
  return [inkedMesh(context, lines, INK.leader), inkedMesh(context, wedge(), INK.wedge)];
}
