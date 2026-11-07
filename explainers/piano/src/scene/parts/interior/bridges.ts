import { CylinderGeometry, Matrix4, Mesh, Vector3 } from 'three';
import type { Group, InstancedMesh } from 'three';
import { extrudePlan, planShape } from '@core/scene/geometry/extrude';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SOUNDBOARD } from '../../../model';
import { FINISHES } from '../../finishes';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { BRIDGE_PIN } from './constants';
import { BASS_BRIDGE, MAIN_BRIDGE } from './bridgePlan';
import type { BridgeBand } from './bridgePlan';
import { PIANO_STRINGS, pointAlong, stringsIn } from './layout';
import type { PianoString } from './layout';
import { instances, patchedMaterial } from './materials';
import type { VertexPatch } from './patches';
import { leftOf, plan } from './planMath';
import { bridgeTop, radiusOf } from './stringEnds';

const PIN_SIDES = 6;
const PINS_PER_STRING = 2;

function bandTop(strings: readonly PianoString[]): number {
  return Math.min(...strings.map(bridgeTop));
}

export const BRIDGE_TOPS = {
  main: bandTop(PIANO_STRINGS.filter((string) => string.band !== 'bass')),
  bass: bandTop(stringsIn('bass')),
} as const;

function bridgeSolid(band: BridgeBand, top: number) {
  return extrudePlan(planShape(band.ring), SOUNDBOARD.topY, top);
}

function bridgeMesh(context: PartContext, breath: VertexPatch): Mesh {
  const geometry = mergeGeometries([
    bridgeSolid(MAIN_BRIDGE, BRIDGE_TOPS.main),
    bridgeSolid(BASS_BRIDGE, BRIDGE_TOPS.bass),
  ]);
  const material = patchedMaterial(context, {
    group: 'bridge',
    finish: FINISHES.bridgeWood,
    patch: breath,
  });
  const mesh = new Mesh(context.tracker.track(geometry), material);
  mesh.name = 'bridge';
  return mesh;
}

function pinSpots(string: PianoString): Vector3[] {
  const side = leftOf(plan(string.direction));
  const offset = BRIDGE_PIN.radius + radiusOf(string);
  const front = string.back;
  const back = pointAlong(string.back, string.direction, BRIDGE_PIN.stagger);
  const bottom = bridgeTop(string) - BRIDGE_PIN.sink;
  return [
    new Vector3(front[0] + side.x * offset, bottom, front[2] + side.z * offset),
    new Vector3(back[0] - side.x * offset, bottom, back[2] - side.z * offset),
  ];
}

function bridgePins(context: PartContext, breath: VertexPatch): InstancedMesh {
  const height = BRIDGE_PIN.sink + BRIDGE_PIN.rise;
  const geometry = new CylinderGeometry(
    BRIDGE_PIN.radius,
    BRIDGE_PIN.radius,
    height,
    PIN_SIDES,
    1,
    true,
  );
  geometry.translate(0, height / 2, 0);
  const count = PIANO_STRINGS.length * PINS_PER_STRING;
  const material = patchedMaterial(context, {
    group: 'bridge',
    finish: FINISHES.pinSteel,
    patch: breath,
  });
  const mesh = instances(context, geometry, material, count);
  const matrix = new Matrix4();
  PIANO_STRINGS.flatMap(pinSpots).forEach((spot, index) => {
    mesh.setMatrixAt(index, matrix.makeTranslation(spot));
  });
  mesh.computeBoundingSphere();
  mesh.name = 'bridgePins';
  return mesh;
}

export function createBridges(context: PartContext, breath: VertexPatch): Group {
  const group = namedGroup('bridge');
  group.add(bridgeMesh(context, breath), bridgePins(context, breath));
  return group;
}
