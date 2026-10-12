import { CylinderGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { box } from '@core/scene/geometry/box';
import type { AssemblyState } from '../../ids';
import { GUARD_SWING_SECONDS, SAW_GEOMETRY } from '../../model';
import { GUARD, TRIGGER } from '../constants';
import { mergeParts } from '../geometry/merge';
import { extrudeAlongZ, rectShape, roundedOutline, tubeThrough } from '../geometry/profile';
import type { Outline } from '../geometry/profile';
import { shellHalf, solidBody } from '../geometry/shell';
import type { ShellSpec } from '../geometry/shell';
import type { Vec3 } from '../geometry/builder';
import { Ease } from './ease';
import { addPart, label, namedGroup } from './context';
import type { PartContext, Section } from './context';

const ROUND = 20;
const HEX = 6;
const SHELL_WALL = 0.0025;

const TOP_COVER: ShellSpec = {
  outline: [
    [-0.118, 0.128],
    [0.072, 0.128],
    [0.072, 0.235],
    [0.04, 0.268],
    [-0.075, 0.272],
    [-0.118, 0.242],
  ],
  radius: 0.018,
  wall: SHELL_WALL,
  depth: { from: -0.076, to: 0.062 },
  bevel: 0.012,
};

const BODY: ShellSpec = {
  outline: [
    [-0.122, 0.004],
    [0.078, 0.004],
    [0.082, 0.05],
    [0.08, 0.132],
    [-0.122, 0.132],
  ],
  radius: 0.016,
  wall: SHELL_WALL,
  depth: { from: -0.07, to: 0.056 },
  bevel: 0.01,
};

const MUFFLER: ShellSpec = {
  outline: [
    [0.05, 0.14],
    [0.11, 0.142],
    [0.112, 0.218],
    [0.05, 0.22],
  ],
  radius: 0.012,
  wall: 0.002,
  depth: { from: -0.02, to: 0.05 },
  bevel: 0.006,
};

const CLUTCH_COVER: Outline = [
  [-0.03, 0.045],
  [0.12, 0.06],
  [0.122, 0.138],
  [0.06, 0.162],
  [-0.03, 0.156],
];

const REAR_HANDLE: readonly Vec3[] = [
  [-0.108, 0.172, 0],
  [-0.16, 0.166, 0],
  [-0.3, 0.164, 0],
  [-0.346, 0.15, 0],
  [-0.362, 0.11, 0],
  [-0.338, 0.056, 0],
  [-0.27, 0.034, 0],
];

const FRONT_HANDLE: readonly Vec3[] = [
  [0.06, 0.2, 0.058],
  [0.056, 0.262, 0.056],
  [0.046, 0.298, 0.028],
  [0.04, 0.304, -0.022],
  [0.046, 0.288, -0.084],
  [0.055, 0.238, -0.104],
  [0.058, 0.168, -0.107],
  [0.055, 0.11, -0.101],
  [0.05, 0.084, -0.074],
];

const TRIGGER_OUTLINE: Outline = [
  [0.004, 0.002],
  [-0.004, -0.017],
  [-0.03, -0.023],
  [-0.043, -0.016],
  [-0.04, -0.005],
  [-0.01, 0.001],
];

const GUARD_OUTLINE: Outline = [
  [-GUARD.halfWidth, GUARD.plateBottom],
  [GUARD.halfWidth, GUARD.plateBottom],
  [GUARD.halfWidth - 0.004, 0.098],
  [0.046, 0.11],
  [-0.046, 0.11],
  [-GUARD.halfWidth + 0.004, 0.098],
];

const CATCHER: Outline = [
  [0.055, 0.05],
  [0.088, 0.05],
  [0.091, 0.073],
  [0.083, 0.075],
  [0.08, 0.06],
  [0.055, 0.06],
];

function zCylinder(
  radius: number,
  from: number,
  to: number,
  x: number,
  y: number,
  segments = ROUND,
): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, to - from, segments);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(x, y, (from + to) / 2);
  return geometry;
}

function yCylinder(
  radius: number,
  bottom: number,
  top: number,
  x: number,
  z: number,
): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, top - bottom, ROUND);
  geometry.translate(x, (bottom + top) / 2, z);
  return geometry;
}

function xCylinder(radius: number, from: number, to: number, y: number, z: number): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, to - from, ROUND);
  geometry.rotateZ(Math.PI / 2);
  geometry.translate((from + to) / 2, y, z);
  return geometry;
}

function guardGeometry(): BufferGeometry {
  const plate = extrudeAlongZ(
    roundedOutline(GUARD_OUTLINE, 0.008),
    { from: -GUARD.thickness / 2, to: GUARD.thickness / 2 },
    0.002,
  );
  plate.rotateY(Math.PI / 2);
  const armCentre = GUARD.halfWidth - GUARD.armHalfWidth;
  const arm = (sign: number) =>
    box({
      minX: -GUARD.thickness / 2,
      maxX: GUARD.thickness / 2,
      minY: 0,
      maxY: GUARD.plateBottom + 0.004,
      minZ: sign * armCentre - GUARD.armHalfWidth,
      maxZ: sign * armCentre + GUARD.armHalfWidth,
    });
  return mergeParts([plate, arm(1), arm(-1)]);
}

function starterGeometry(): BufferGeometry {
  const [minX, minY, minZ] = SAW_GEOMETRY.starter.min;
  const [, maxY, maxZ] = SAW_GEOMETRY.starter.max;
  return extrudeAlongZ(rectShape(minX, minY, 0.04, maxY, 0.03), { from: minZ, to: maxZ }, 0.008);
}

function starterDetails(): BufferGeometry {
  const face = SAW_GEOMETRY.starter.min[2];
  const slots = [0.07, 0.085, 0.1, 0.115].map((y) =>
    box({
      minX: -0.055,
      maxX: 0.015,
      minY: y,
      maxY: y + 0.006,
      minZ: face - 0.001,
      maxZ: face + 0.002,
    }),
  );
  return mergeParts([...slots, xCylinder(0.0024, -0.012, 0.012, 0.186, -0.088)]);
}

function tankGeometry(): BufferGeometry {
  const [minX, minY, minZ] = SAW_GEOMETRY.fuelTank.min;
  const [maxX, maxY, maxZ] = SAW_GEOMETRY.fuelTank.max;
  return extrudeAlongZ(rectShape(minX, minY, maxX, maxY, 0.022), { from: minZ, to: maxZ }, 0.014);
}

function oilTankGeometry(): BufferGeometry {
  const [minX, minY, minZ] = SAW_GEOMETRY.oilTank.min;
  const [maxX, maxY, maxZ] = SAW_GEOMETRY.oilTank.max;
  return extrudeAlongZ(
    rectShape(minX, minY + 0.003, maxX, maxY, 0.014),
    { from: minZ, to: maxZ },
    0.008,
  );
}

function mufflerGrille(): BufferGeometry {
  const front = MUFFLER.outline[1][0];
  return mergeParts(
    [0.152, 0.162, 0.172, 0.182].map((y) =>
      box({
        minX: front - 0.001,
        maxX: front + 0.0025,
        minY: y,
        maxY: y + 0.0045,
        minZ: -0.008,
        maxZ: 0.038,
      }),
    ),
  );
}

function coverNuts(): BufferGeometry {
  const [, , coverZ] = SAW_GEOMETRY.clutchCover.max;
  return mergeParts(
    [0.045, 0.085].map((x) => zCylinder(0.0068, coverZ - 0.004, coverZ + 0.008, x, 0.1, HEX)),
  );
}

export function buildHousing(context: PartContext, parent: Object3D): Section {
  const root = namedGroup('housing', parent);
  const solids = namedGroup('housingSolid', root);
  const shells = namedGroup('housingShell', root);
  addPart(context, solids, solidBody(TOP_COVER), 'powerhead');
  addPart(context, solids, solidBody(BODY), 'powerhead', 'plastic');
  addPart(context, solids, solidBody(MUFFLER), 'muffler');
  addPart(context, shells, shellHalf(TOP_COVER, 'back'), 'powerhead');
  addPart(context, shells, shellHalf(BODY, 'back'), 'powerhead', 'plastic');
  addPart(context, shells, shellHalf(MUFFLER, 'back'), 'muffler');
  addPart(context, root, mufflerGrille(), 'muffler', 'darkSteel');
  label(context, 'powerhead', root, [-0.03, 0.272, -0.03]);
  label(context, 'muffler', root, [0.112, 0.205, 0.015]);

  const cover = namedGroup('clutchCover', root);
  const [, , coverFrom] = SAW_GEOMETRY.clutchCover.min;
  const [, , coverTo] = SAW_GEOMETRY.clutchCover.max;
  addPart(
    context,
    cover,
    extrudeAlongZ(roundedOutline(CLUTCH_COVER, 0.02), { from: coverFrom, to: coverTo }, 0.01),
    'powerhead',
    'plastic',
  );
  addPart(context, cover, coverNuts(), 'powerhead', 'steel');

  addPart(context, root, starterGeometry(), 'starter');
  addPart(context, root, starterDetails(), 'starter', 'grip');
  addPart(context, root, xCylinder(0.0072, -0.032, 0.032, 0.192, -0.088), 'starter', 'grip');
  label(context, 'starter', root, [-0.02, 0.15, SAW_GEOMETRY.starter.min[2]]);

  addPart(context, root, tankGeometry(), 'fuelTank');
  addPart(context, root, yCylinder(0.017, 0.078, 0.092, -0.205, -0.035), 'fuelTank', 'housing');
  label(context, 'fuelTank', root, [-0.17, SAW_GEOMETRY.fuelTank.max[1], 0.03]);

  addPart(context, root, oilTankGeometry(), 'oilTank');
  addPart(context, root, yCylinder(0.012, 0.058, 0.068, 0.078, 0.058), 'oilTank', 'oilCap');
  label(context, 'oilTank', root, [0.09, 0.03, SAW_GEOMETRY.oilTank.max[2]]);

  addPart(context, root, tubeThrough(REAR_HANDLE, 0.0135), 'rearHandle');
  label(context, 'rearHandle', root, [-0.29, 0.178, 0]);
  addPart(context, root, tubeThrough(FRONT_HANDLE, 0.0105), 'frontHandle');
  label(context, 'frontHandle', root, [0.042, 0.315, -0.02]);
  addPart(
    context,
    root,
    extrudeAlongZ(roundedOutline(CATCHER, 0.002), { from: 0.0835, to: 0.0925 }, 0.0015),
    'chainCatcher',
  );
  label(context, 'chainCatcher', root, [0.086, 0.058, 0.0925]);

  const trigger = namedGroup('trigger', root);
  trigger.position.set(TRIGGER.pivot[0], TRIGGER.pivot[1], 0);
  addPart(
    context,
    trigger,
    extrudeAlongZ(roundedOutline(TRIGGER_OUTLINE, 0.003), { from: -0.0045, to: 0.0045 }, 0.0015),
    'throttleTrigger',
  );
  label(context, 'throttleTrigger', trigger, [-0.03, -0.022, 0.0045]);

  const guard = namedGroup('handGuard', root);
  guard.position.set(...SAW_GEOMETRY.handGuardPivot);
  addPart(context, guard, guardGeometry(), 'handGuard');
  addPart(
    context,
    guard,
    zCylinder(0.0032, -GUARD.halfWidth - 0.002, GUARD.halfWidth + 0.002, 0, 0),
    'handGuard',
    'steel',
  );
  label(context, 'handGuard', guard, [GUARD.thickness / 2, 0.1, 0.03]);

  const pull = new Ease(0);
  const tip = new Ease(0, GUARD_SWING_SECONDS);
  const pose = () => {
    trigger.rotation.z = -toRadians(TRIGGER.pullDeg) * pull.value;
    guard.rotation.z = -toRadians(SAW_GEOMETRY.guardTripDeg) * tip.value;
  };
  return {
    root,
    setState: (state: AssemblyState) => {
      const cutaway = state.view.cutaway;
      solids.visible = !cutaway;
      shells.visible = cutaway;
      cover.visible = !cutaway;
      pull.aim(state.drive.throttle);
      tip.aim(state.safety.guardForward);
      pose();
    },
    update: (deltaSeconds: number) => {
      pull.step(deltaSeconds);
      tip.step(deltaSeconds);
      pose();
      return pull.running || tip.running;
    },
  };
}
