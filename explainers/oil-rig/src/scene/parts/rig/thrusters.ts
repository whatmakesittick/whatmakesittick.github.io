import { Group, Matrix4 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { HULL, SEGMENTS, THRUSTER } from '../../constants';
import { barGeometry, rodGeometry } from '../../geometry/bars';
import { merge, mergePainted } from '../../geometry/merge';
import { tubeGeometry } from '../../geometry/tubes';
import { partMesh } from '../context';
import type { PartContext } from '../context';

export interface ThrustersPart {
  object: Group;
  anchor: Object3D;
}

const POD_DARK = '#8a392f';
const NOZZLE = '#5b636a';
const BRONZE = '#b89056';
const QUARTER_TURN = Math.PI / 2;
const NOZZLE_SEGMENTS = 16;

function podCentreY(): number {
  return -THRUSTER.strut.length - THRUSTER.pod.radius * 0.6;
}

function nozzle(): BufferGeometry {
  const { radius, thickness, length } = THRUSTER.nozzle;
  const ring = tubeGeometry({
    outer: radius,
    inner: radius - thickness,
    bottom: -length / 2,
    top: length / 2,
    segments: NOZZLE_SEGMENTS,
  });
  ring.rotateZ(QUARTER_TURN);
  ring.translate(-THRUSTER.pod.length / 2, podCentreY(), 0);
  return ring;
}

function blades(): BufferGeometry[] {
  const { length, width, thickness } = THRUSTER.blade;
  const x = -THRUSTER.pod.length / 2;
  const y = podCentreY();
  return Array.from({ length: THRUSTER.blades }, (_, index) => {
    const angle = (index / THRUSTER.blades) * Math.PI * 2;
    const tip: [number, number, number] = [
      x,
      y + length * Math.cos(angle),
      length * Math.sin(angle),
    ];
    return barGeometry([x, y, 0], tip, width, thickness);
  });
}

function thrusterGeometry(): BufferGeometry {
  const { strut, pod } = THRUSTER;
  const y = podCentreY();
  return mergePainted([
    [rodGeometry([0, 0, 0], [0, y, 0], strut.radius, SEGMENTS.pipe), POD_DARK],
    [
      rodGeometry([-pod.length / 2, y, 0], [pod.length / 2, y, 0], pod.radius, SEGMENTS.halfTube),
      POD_DARK,
    ],
    [nozzle(), NOZZLE],
    ...blades().map((blade) => [blade, BRONZE] as const),
  ]);
}

function placements(): Matrix4[] {
  const matrices: Matrix4[] = [];
  let index = 0;
  for (const side of [1, -1]) {
    for (const end of [1, -1]) {
      THRUSTER.xs.forEach((x, slot) => {
        const z = side * HULL.pontoon.offset + (slot === 0 ? -1 : 1) * THRUSTER.zSpread;
        const heading = THRUSTER.headings[index++ % THRUSTER.headings.length];
        matrices.push(new Matrix4().makeRotationY(heading).setPosition(end * x, HULL.keelY, z));
      });
    }
  }
  return matrices;
}

export function createThrusters(context: PartContext): ThrustersPart {
  const object = new Group();
  const template = thrusterGeometry();
  const geometry = merge(placements().map((matrix) => template.clone().applyMatrix4(matrix)));
  template.dispose();
  object.add(partMesh(context, geometry, 'thruster', 'thruster'));
  const front = HULL.pontoon.offset + THRUSTER.zSpread;
  return {
    object,
    anchor: anchorAt(object, THRUSTER.xs[1], HULL.keelY + podCentreY(), front),
  };
}
