import { BoxGeometry, CylinderGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { box } from '@core/scene/geometry/box';
import type { AssemblyState } from '../../ids';
import { SAW_GEOMETRY } from '../../model';
import { CARB } from '../constants';
import { mergeParts } from '../geometry/merge';
import { extrudeAlongZ, rectShape, tubeThrough } from '../geometry/profile';
import type { Vec3 } from '../geometry/builder';
import { Ease } from './ease';
import { addPart, label, namedGroup, setFronts } from './context';
import type { PartContext, Section } from './context';

const ROUND = 20;
const WALL = 0.002;
const PLATE_THICKNESS = 0.0012;
const SHAFT_RADIUS = 0.0013;
const LEVER = { length: 0.01, width: 0.003, thickness: 0.0015 } as const;
const OPEN_DEG = 90;

const PULSE_LINE: readonly Vec3[] = [
  [-0.036, 0.064, -0.041],
  [-0.06, 0.072, -0.046],
  [-0.078, 0.11, -0.04],
  [-0.084, 0.142, -0.031],
];

const FUEL_LINE: readonly Vec3[] = [
  [-0.112, 0.07, -0.03],
  [-0.108, 0.11, -0.036],
  [-0.1, 0.14, -0.032],
  [-0.092, 0.146, -0.028],
];

type Side = 'back' | 'front';

function zSpan(side: Side, near: number, far: number): { minZ: number; maxZ: number } {
  return side === 'back' ? { minZ: -far, maxZ: -near } : { minZ: near, maxZ: far };
}

function squareDuct(
  side: Side,
  from: number,
  to: number,
  halfHeight: number,
  halfWidth: number,
  outerHalfWidth: number,
): BufferGeometry {
  const y = CARB.boreY;
  const plate = (minY: number, maxY: number) =>
    box({ minX: from, maxX: to, minY, maxY, ...zSpan(side, 0, outerHalfWidth) });
  const wall = box({
    minX: from,
    maxX: to,
    minY: y - halfHeight,
    maxY: y + halfHeight,
    ...zSpan(side, halfWidth, outerHalfWidth),
  });
  return mergeParts([
    plate(y + halfHeight, y + halfHeight + WALL * 3),
    plate(y - halfHeight - WALL * 3, y - halfHeight),
    wall,
  ]);
}

function carbBody(side: Side): BufferGeometry {
  const [minX, minY, minZ] = SAW_GEOMETRY.carburettor.min;
  const [maxX, maxY] = SAW_GEOMETRY.carburettor.max;
  const outer = -minZ;
  const top = box({ minX, maxX, minY: CARB.boreY + CARB.boreHalf, maxY, ...zSpan(side, 0, outer) });
  const bottom = box({
    minX,
    maxX,
    minY,
    maxY: CARB.boreY - CARB.boreHalf,
    ...zSpan(side, 0, outer),
  });
  const wall = box({
    minX,
    maxX,
    minY: CARB.boreY - CARB.boreHalf,
    maxY: CARB.boreY + CARB.boreHalf,
    ...zSpan(side, CARB.boreHalf, outer),
  });
  const parts = [top, bottom, wall];
  if (side === 'back') {
    const cover = new CylinderGeometry(0.013, 0.013, 0.005, ROUND);
    cover.rotateX(Math.PI / 2);
    cover.translate((minX + maxX) / 2, CARB.boreY - 0.004, minZ - 0.0025);
    parts.push(cover);
  }
  return mergeParts(parts);
}

function butterfly(): BufferGeometry {
  const size = CARB.boreHalf * 2 - 0.0008;
  const plate = new BoxGeometry(PLATE_THICKNESS, size, size);
  const shaft = new CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, 0.056, 10);
  shaft.rotateX(Math.PI / 2);
  const lever = new BoxGeometry(LEVER.width, LEVER.length, LEVER.thickness);
  lever.translate(0, LEVER.length / 2, -0.028);
  return mergeParts([plate, shaft, lever]);
}

function airFilter(): BufferGeometry {
  const [minX, minY, minZ] = SAW_GEOMETRY.airFilter.min;
  const [maxX, maxY, maxZ] = SAW_GEOMETRY.airFilter.max;
  return extrudeAlongZ(rectShape(minX, minY, maxX, maxY, 0.008), { from: minZ, to: maxZ }, 0.004);
}

function filterRibs(): BufferGeometry {
  const [minX, , minZ] = SAW_GEOMETRY.airFilter.min;
  const [maxX, maxY, maxZ] = SAW_GEOMETRY.airFilter.max;
  const count = 6;
  const pitch = (maxX - minX - 0.016) / (count - 1);
  return mergeParts(
    Array.from({ length: count }, (_, index) => {
      const x = minX + 0.008 + index * pitch;
      return box({
        minX: x - 0.0012,
        maxX: x + 0.0012,
        minY: maxY - 0.001,
        maxY: maxY + 0.0015,
        minZ: minZ + 0.006,
        maxZ: maxZ - 0.006,
      });
    }),
  );
}

export function buildFuel(context: PartContext, parent: Object3D): Section {
  const root = namedGroup('fuel', parent);
  const back = namedGroup('fuelBack', root);
  const front = namedGroup('fuelFront', root);
  const halves = { back, front };
  (['back', 'front'] as const).forEach((side) => {
    addPart(context, halves[side], carbBody(side), 'carburettor');
    const runner = squareDuct(
      side,
      CARB.runnerFrom,
      CARB.runnerTo,
      CARB.runnerHalfHeight,
      CARB.runnerHalfWidth,
      CARB.runnerHalfWidth + WALL,
    );
    addPart(context, halves[side], runner, 'intakePort', 'rubber');
  });
  label(context, 'carburettor', back, [-0.1, SAW_GEOMETRY.carburettor.max[1], -0.01]);

  const throttle = namedGroup('throttleValve', root);
  throttle.position.set(CARB.plateX, CARB.boreY, 0);
  addPart(context, throttle, butterfly(), 'throttleValve');
  label(context, 'throttleValve', throttle, [0, CARB.boreHalf * 0.7, 0]);
  const choke = namedGroup('chokeValve', root);
  choke.position.set(CARB.chokeX, CARB.boreY, 0);
  choke.rotation.z = toRadians(OPEN_DEG);
  addPart(context, choke, butterfly(), 'chokeValve');
  label(context, 'chokeValve', choke, [0, 0, -0.006]);

  addPart(context, root, airFilter(), 'airFilter');
  addPart(context, root, filterRibs(), 'airFilter', 'castAlloy');
  label(context, 'airFilter', root, [-0.07, SAW_GEOMETRY.airFilter.max[1] + 0.0015, 0.02]);
  addPart(context, root, tubeThrough(PULSE_LINE, 0.0026), 'pulseLine');
  label(context, 'pulseLine', root, [...PULSE_LINE[2]]);
  addPart(context, root, tubeThrough(FUEL_LINE, 0.0022), 'fuelTank', 'fuelLine');

  const fronts = [front];
  const opening = new Ease(0);
  const pose = () => {
    const idle = OPEN_DEG - CARB.plateClosedDeg;
    throttle.rotation.z = toRadians(idle + CARB.plateClosedDeg * opening.value);
  };
  return {
    root,
    setState: (state: AssemblyState) => {
      setFronts(fronts, state.view.cutaway);
      opening.aim(state.drive.throttle);
      pose();
    },
    update: (deltaSeconds: number) => {
      opening.step(deltaSeconds);
      pose();
      return opening.running;
    },
  };
}
