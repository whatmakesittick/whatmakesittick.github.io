import { Vector3 } from 'three';
import type { BufferGeometry, Group, Mesh, Object3D } from 'three';
import { latheAlongX, sampleProfile } from '@core/scene/geometry/lathe';
import type { ProfilePoint } from '@core/scene/geometry/lathe';
import { bandGeometry } from '../../geometry/band';
import { bladeGeometries } from '../../geometry/blade';
import { cylinderBetween } from '../../geometry/cylinder';
import { mergeParts } from '../../geometry/merge';
import { FINISHES } from '../../finishes';
import { degrees, finishMesh, groupMesh, label, namedGroup, partMesh } from '../context';
import type { PartContext } from '../context';
import { HUB } from './constants';

const BLADE_COUNT = 3;
const BAND_FINISH = {
  ...FINISHES.paintShade,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
};
const BLADE_LABEL_RADIUS = 52;
const HUB_BODY: readonly ProfilePoint[] = [
  [-1.05, 0],
  [-0.95, 0.55],
  [-0.6, 0.92],
  [0.6, 0.95],
  [1.1, 0.8],
  [1.3, 0.62],
];
const SHAFT = { from: 1.2, to: 2.75, radius: 0.6, segments: 24 } as const;
const BEARING = { inner: 1.02, outer: 1.24, bottom: 1.15, top: 1.5, segments: 32 } as const;
const NECK = { bottom: 0.6, top: 1.2, radius: 0.75, segments: 24 } as const;
const COLLAR = { inner: 0.7, outer: 1.12, bottom: 1.08, top: 1.2 } as const;
const PITCH_CYLINDER = {
  start: new Vector3(-0.78, 0.5, -0.62),
  end: new Vector3(-0.98, 1.28, 0.7),
  bodyShare: 0.62,
  body: 0.11,
  rod: 0.05,
  segments: 10,
} as const;

export interface Rotor {
  readonly root: Group;
  readonly pitchGroups: readonly Group[];
  readonly pitchCylinders: readonly Mesh[];
  readonly blade: BufferGeometry;
}

function hubGeometry(): BufferGeometry {
  const body = latheAlongX(sampleProfile(HUB_BODY, 12), 32);
  const shaft = cylinderBetween(
    new Vector3(SHAFT.from, 0, 0),
    new Vector3(SHAFT.to, 0, 0),
    SHAFT.radius,
    SHAFT.segments,
  );
  const necks = Array.from({ length: BLADE_COUNT }, (_, index) => {
    const neck = bandGeometry(
      { inner: 0, outer: NECK.radius, bottom: NECK.bottom, top: NECK.top },
      NECK.segments,
    );
    const collar = bandGeometry(COLLAR, NECK.segments);
    const turned = mergeParts([neck, collar]);
    turned.rotateX((index * 2 * Math.PI) / BLADE_COUNT);
    return turned;
  });
  return mergeParts([body, shaft, ...necks]);
}

function pitchCylinderGeometry(): BufferGeometry {
  const { start, end, bodyShare } = PITCH_CYLINDER;
  const split = start.clone().lerp(end, bodyShare);
  return mergeParts([
    cylinderBetween(start, split, PITCH_CYLINDER.body, PITCH_CYLINDER.segments),
    cylinderBetween(split, end, PITCH_CYLINDER.rod, PITCH_CYLINDER.segments),
  ]);
}

export function buildRotor(context: PartContext, yaw: Object3D): Rotor {
  const root = namedGroup('rotor', yaw);
  root.position.set(...HUB);
  root.add(groupMesh(context, hubGeometry(), 'hub', 'castIron'));
  const bearing = bandGeometry(BEARING, BEARING.segments);
  const cylinder = pitchCylinderGeometry();
  const { body: blade, band } = bladeGeometries();
  const pitchGroups: Group[] = [];
  const pitchCylinders: Mesh[] = [];
  for (let index = 0; index < BLADE_COUNT; index += 1) {
    const arm = namedGroup(`bladeArm${index}`, root);
    arm.rotation.x = (index * 2 * Math.PI) / BLADE_COUNT;
    arm.updateMatrix();
    arm.add(groupMesh(context, bearing, 'hub', 'steel'));
    const actuator = partMesh(context, cylinder, 'pitchCylinders');
    arm.add(actuator);
    pitchCylinders.push(actuator);
    const pitch = namedGroup(`bladePitch${index}`, arm);
    const mesh = partMesh(context, blade, 'blades');
    mesh.add(finishMesh(context, band, 'blades', BAND_FINISH));
    pitch.add(mesh);
    pitchGroups.push(pitch);
  }
  label(context, 'blades', yaw, [HUB[0], HUB[1] + BLADE_LABEL_RADIUS, HUB[2]]);
  return { root, pitchGroups, pitchCylinders, blade };
}

export function turnRotor(rotor: Rotor, azimuth: number, pitchDeg: number): void {
  rotor.root.rotation.x = azimuth;
  rotor.root.updateMatrix();
  rotor.pitchGroups.forEach((pitch) => {
    pitch.rotation.y = -degrees(pitchDeg);
    pitch.updateMatrix();
  });
}
