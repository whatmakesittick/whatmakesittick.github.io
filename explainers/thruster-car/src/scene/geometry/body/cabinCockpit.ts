import type { BufferGeometry } from 'three';
import { CylinderGeometry, ExtrudeGeometry, Shape, TorusGeometry } from 'three';
import { FULL_TURN, toRadians } from '@core/math';
import { SEAT } from '../../../model/layout';
import { orientedBox, placed } from './cabinFrame';
import type { Basis } from './cabinFrame';
import { shellCeiling, shellHalfWidth } from './cabinFit';
import { TUB } from './cabinTub';
import { add, scale } from './mesh';
import type { Vec3 } from './mesh';

export interface CockpitGeometry {
  wheel: BufferGeometry[];
  dash: BufferGeometry[];
  screen: BufferGeometry[];
}

const DRIVER_Z = SEAT[2];

export const DASH = {
  rear: 0.93,
  front: 1.24,
  inboard: -0.06,
  topLimit: 0.71,
  headroom: 0.05,
  sideGap: 0.06,
  rearDrop: 0.07,
  frontDrop: 0.045,
  lip: 0.03,
  bevel: 0.008,
  bevelSteps: 2,
  curveSteps: 5,
} as const;

export const WHEEL_RIM = {
  hub: [SEAT[0] + 0.48, 0.56, DRIVER_Z] as Vec3,
  rise: toRadians(8),
  radius: 0.17,
  grip: 0.018,
  sweep: toRadians(290),
  radialSteps: 6,
  ringSteps: 28,
} as const;

const HUB = { size: [0.1, 0.075, 0.045] as Vec3 } as const;
const SPOKE = { width: 0.032, depth: 0.018 } as const;
const COLUMN = { radius: 0.026, steps: 12, overlap: 0.01 } as const;
const SHROUD = { length: 0.12, height: 0.075, width: 0.09 } as const;
const SUPPORT = { depth: 0.03, foot: 0.12, lean: 0.05 } as const;
const SCREEN = {
  width: 0.2,
  height: 0.07,
  depth: 0.01,
  tilt: toRadians(35),
  inset: 0.065,
  housing: 0.012,
  glowDepth: 0.002,
  gap: 0.001,
} as const;

function columnAxis(): Vec3 {
  return [Math.cos(WHEEL_RIM.rise), Math.sin(WHEEL_RIM.rise), 0];
}

function perpendicular(axis: Vec3): Vec3 {
  return [-axis[1], axis[0], 0];
}

function wheelBasis(): Basis {
  const axis = columnAxis();
  return [[0, 0, 1], perpendicular(axis), scale(axis, -1)];
}

function chordHeight(): number {
  const gap = FULL_TURN - WHEEL_RIM.sweep;
  return WHEEL_RIM.radius * Math.cos(gap / 2);
}

function rim(): BufferGeometry[] {
  const { radius, grip, radialSteps, ringSteps, sweep, hub } = WHEEL_RIM;
  const gap = FULL_TURN - sweep;
  const ring = new TorusGeometry(radius, grip, radialSteps, ringSteps, sweep);
  ring.rotateZ(-Math.PI / 2 + gap / 2);
  const chord = 2 * radius * Math.sin(gap / 2);
  const bottom = new CylinderGeometry(grip, grip, chord, radialSteps);
  bottom.rotateZ(Math.PI / 2);
  bottom.translate(0, -chordHeight(), 0);
  return [ring, bottom].map((part) => placed(part, hub, wheelBasis()));
}

function hubAndSpokes(): BufferGeometry[] {
  const basis = wheelBasis();
  const [lateral, up] = basis;
  const { hub, radius } = WHEEL_RIM;
  const [hubWidth, hubHeight] = HUB.size;
  const sideLength = radius - hubWidth / 2;
  const lowLength = chordHeight() - hubHeight / 2;
  const sideSpoke = (sign: number) =>
    orientedBox(add(hub, scale(lateral, (sign * (hubWidth + sideLength)) / 2)), basis, [
      sideLength,
      SPOKE.width,
      SPOKE.depth,
    ]);
  const lowCentre = add(hub, scale(up, -(hubHeight + lowLength) / 2));
  return [
    orientedBox(hub, basis, HUB.size),
    sideSpoke(1),
    sideSpoke(-1),
    orientedBox(
      lowCentre,
      [up, scale(lateral, -1), basis[2]],
      [lowLength, SPOKE.width, SPOKE.depth],
    ),
  ];
}

function columnLength(): number {
  return (DASH.rear + COLUMN.overlap - WHEEL_RIM.hub[0]) / columnAxis()[0];
}

function column(): BufferGeometry[] {
  const axis = columnAxis();
  const { hub } = WHEEL_RIM;
  const length = columnLength();
  const basis: Basis = [scale(perpendicular(axis), -1), axis, [0, 0, 1]];
  const tube = new CylinderGeometry(COLUMN.radius, COLUMN.radius, length, COLUMN.steps);
  const shroudCentre = add(hub, scale(axis, length - SHROUD.length / 2));
  return [
    placed(tube, add(hub, scale(axis, length / 2)), basis),
    orientedBox(
      shroudCentre,
      [axis, perpendicular(axis), [0, 0, 1]],
      [SHROUD.length, SHROUD.height, SHROUD.width],
    ),
  ];
}

export function dashTop(): number {
  const outboard = -dashOutboard();
  const ceilings = [DASH.rear, DASH.front].map((x) => shellCeiling(x, outboard) - DASH.headroom);
  return Math.min(DASH.topLimit, ...ceilings);
}

export function dashOutboard(): number {
  return -(shellHalfWidth(DASH.front, DASH.topLimit) - DASH.sideGap);
}

function dashProfile(top: number): Shape {
  const { rear, front, rearDrop, frontDrop, lip } = DASH;
  const shape = new Shape();
  shape.moveTo(rear, top - rearDrop);
  shape.lineTo(rear, top - lip);
  shape.quadraticCurveTo(rear, top, rear + lip, top);
  shape.lineTo(front - lip, top);
  shape.quadraticCurveTo(front, top, front, top - lip);
  shape.lineTo(front, top - frontDrop);
  shape.lineTo(rear + lip, top - rearDrop);
  shape.closePath();
  return shape;
}

function dashboard(): BufferGeometry {
  const top = dashTop();
  const outboard = dashOutboard();
  const depth = DASH.inboard - outboard - 2 * DASH.bevel;
  const geometry = new ExtrudeGeometry(dashProfile(top), {
    depth,
    bevelEnabled: true,
    bevelThickness: DASH.bevel,
    bevelSize: DASH.bevel,
    bevelSegments: DASH.bevelSteps,
    curveSegments: DASH.curveSteps,
  });
  geometry.translate(0, 0, outboard + DASH.bevel);
  return geometry;
}

function dashSupport(): BufferGeometry {
  const top = dashTop();
  const shape = new Shape();
  shape.moveTo(DASH.rear + SUPPORT.foot, TUB.top);
  shape.lineTo(TUB.footwell, TUB.top);
  shape.lineTo(TUB.footwell, top - DASH.frontDrop);
  shape.lineTo(DASH.rear + SUPPORT.lean, top - DASH.rearDrop);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: SUPPORT.depth, bevelEnabled: false });
  geometry.translate(0, 0, DASH.inboard - SUPPORT.depth);
  return geometry;
}

function screenBasis(): Basis {
  const { tilt } = SCREEN;
  return [
    [0, 0, 1],
    [Math.sin(tilt), Math.cos(tilt), 0],
    [-Math.cos(tilt), Math.sin(tilt), 0],
  ];
}

function screenCentre(): Vec3 {
  return [DASH.rear + SCREEN.inset, dashTop() + SCREEN.height / 2, DRIVER_Z];
}

function screenParts(): { housing: BufferGeometry; glow: BufferGeometry } {
  const basis = screenBasis();
  const { width, height, depth, housing } = SCREEN;
  const back = orientedBox(screenCentre(), basis, [width + housing, height + housing, depth]);
  const front = add(screenCentre(), scale(basis[2], depth / 2 + SCREEN.gap));
  const glow = orientedBox(front, basis, [width, height, SCREEN.glowDepth]);
  return { housing: back, glow };
}

export function buildCockpit(): CockpitGeometry {
  const { housing, glow } = screenParts();
  return {
    wheel: rim(),
    dash: [dashboard(), dashSupport(), ...column(), housing, ...hubAndSpokes()],
    screen: [glow],
  };
}
