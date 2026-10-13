import { CylinderGeometry, Path, Shape } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import type { AssemblyState } from '../../../ids';
import { CRANK_Y, ENGINE_GEOMETRY, crankPin, crownY } from '../../../model';
import { CRANK, CRANKCASE, PISTON, ROD } from '../../constants';
import { extrudeAlongZ, rectShape } from '../../geometry/profile';
import { mergeParts } from '../../geometry/merge';
import { sector } from '../../geometry/sector';
import { addPart, label, namedGroup } from '../context';
import type { PartContext } from '../context';
import type { HalfId } from './windows';
import { HALF_IDS, HALVES } from './windows';

const CYLINDER_SEGMENTS = 28;
const WEB_SIDE_ANGLE = 0.3;
const LOBE_RADIUS = 0.0098;
const CROWN_SLAB = 0.012;
const SKIRT_INNER = 0.0212;
const PIN_HALF_LENGTH = 0.021;
const SHANK_SHARE = 0.4;
const BOSS_RADIUS = 0.013;
const BOSS_DEPTH = 0.006;

function zCylinder(radius: number, from: number, to: number, x = 0, y = 0): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, to - from, CYLINDER_SEGMENTS);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(x, y, (from + to) / 2);
  return geometry;
}

function webShape(): Shape {
  const shape = new Shape();
  shape.absarc(0, 0, CRANK.web, Math.PI + WEB_SIDE_ANGLE, Math.PI * 2 - WEB_SIDE_ANGLE, false);
  shape.lineTo(LOBE_RADIUS, ENGINE_GEOMETRY.throw);
  shape.absarc(0, ENGINE_GEOMETRY.throw, LOBE_RADIUS, 0, Math.PI, false);
  shape.closePath();
  return shape;
}

function crankGeometry(): BufferGeometry {
  const inner = ROD.thickness / 2 + CRANK.webGap / 4;
  const outer = inner + CRANK.webThickness;
  return mergeParts([
    extrudeAlongZ(webShape(), { from: inner, to: outer }, 0.001),
    extrudeAlongZ(webShape(), { from: -outer, to: -inner }, 0.001),
    zCylinder(CRANK.pin, -inner, inner, 0, ENGINE_GEOMETRY.throw),
  ]);
}

function rodShape(): Shape {
  const length = ENGINE_GEOMETRY.rod;
  const shape = new Shape();
  shape.moveTo(ROD.bigEnd, 0);
  shape.absarc(0, 0, ROD.bigEnd, 0, Math.PI, true);
  shape.lineTo(-ROD.shank, length * SHANK_SHARE);
  shape.lineTo(-ROD.smallEnd, length);
  shape.absarc(0, length, ROD.smallEnd, Math.PI, 0, true);
  shape.lineTo(ROD.shank, length * SHANK_SHARE);
  shape.closePath();
  shape.holes.push(new Path().absarc(0, 0, CRANK.pin, 0, Math.PI * 2, false));
  shape.holes.push(new Path().absarc(0, length, PISTON.wristPin, 0, Math.PI * 2, false));
  return shape;
}

function pistonHalf(half: readonly [number, number]): BufferGeometry {
  const [fromDeg, toDeg] = half;
  const crownTop = -PISTON.crownDome;
  const rings = PISTON.ringGaps.map((gap) =>
    sector({
      inner: PISTON.radius - 0.0006,
      outer: PISTON.radius + 0.0002,
      bottom: -gap - PISTON.ringHeight,
      top: -gap,
      fromDeg,
      toDeg,
    }),
  );
  return mergeParts([
    sector({ inner: 0, outer: PISTON.radius - 0.004, bottom: crownTop, top: 0, fromDeg, toDeg }),
    sector({ inner: 0, outer: PISTON.radius, bottom: -CROWN_SLAB, top: crownTop, fromDeg, toDeg }),
    sector({
      inner: SKIRT_INNER,
      outer: PISTON.radius,
      bottom: -ENGINE_GEOMETRY.pistonLength,
      top: -CROWN_SLAB,
      fromDeg,
      toDeg,
    }),
    ...rings,
  ]);
}

function wristPin(half: HalfId): BufferGeometry {
  const y = -ENGINE_GEOMETRY.pinToCrown;
  return half === 'back'
    ? zCylinder(PISTON.wristPin, -PIN_HALF_LENGTH, 0, 0, y)
    : zCylinder(PISTON.wristPin, 0, PIN_HALF_LENGTH, 0, y);
}

function crankcaseRing(): Shape {
  const [minX, minY] = ENGINE_GEOMETRY.crankcase.min;
  const [maxX, maxY] = ENGINE_GEOMETRY.crankcase.max;
  const { radius, wall, opening } = CRANKCASE;
  const inner = radius - wall;
  const shape = new Shape();
  const corner = {
    left: minX + radius,
    right: maxX - radius,
    low: minY + radius,
    high: maxY - radius,
  };
  shape.moveTo(opening, maxY);
  shape.lineTo(corner.right, maxY);
  shape.absarc(corner.right, corner.high, radius, Math.PI / 2, 0, true);
  shape.absarc(corner.right, corner.low, radius, 0, -Math.PI / 2, true);
  shape.absarc(corner.left, corner.low, radius, -Math.PI / 2, -Math.PI, true);
  shape.absarc(corner.left, corner.high, radius, Math.PI, Math.PI / 2, true);
  shape.lineTo(-opening, maxY);
  shape.lineTo(-opening, maxY - wall);
  shape.absarc(corner.left, corner.high, inner, Math.PI / 2, Math.PI, false);
  shape.absarc(corner.left, corner.low, inner, Math.PI, Math.PI * 1.5, false);
  shape.absarc(corner.right, corner.low, inner, -Math.PI / 2, 0, false);
  shape.absarc(corner.right, corner.high, inner, 0, Math.PI / 2, false);
  shape.lineTo(opening, maxY - wall);
  shape.closePath();
  return shape;
}

function crankcaseHalf(half: HalfId): BufferGeometry {
  const [minX, minY, minZ] = ENGINE_GEOMETRY.crankcase.min;
  const [maxX, maxY, maxZ] = ENGINE_GEOMETRY.crankcase.max;
  const plate = rectShape(minX, minY, maxX, maxY, CRANKCASE.radius);
  const side = half === 'back' ? { from: minZ, to: 0 } : { from: 0, to: maxZ };
  const cover =
    half === 'back'
      ? { from: minZ, to: minZ + CRANKCASE.wall }
      : { from: maxZ - CRANKCASE.wall, to: maxZ };
  const boss =
    half === 'back'
      ? zCylinder(BOSS_RADIUS, minZ - BOSS_DEPTH, minZ + CRANKCASE.wall, 0, CRANK_Y)
      : zCylinder(BOSS_RADIUS, maxZ - CRANKCASE.wall, maxZ + BOSS_DEPTH, 0, CRANK_Y);
  return mergeParts([
    extrudeAlongZ(crankcaseRing(), side),
    extrudeAlongZ(plate, cover, 0.002),
    boss,
  ]);
}

export interface CrankParts {
  readonly fronts: readonly Object3D[];
  setState(state: AssemblyState): void;
}

export function buildCrankTrain(context: PartContext, parent: Object3D): CrankParts {
  const crank = namedGroup('crank', parent);
  crank.position.set(0, CRANK_Y, 0);
  addPart(context, crank, crankGeometry(), 'crankshaft');
  addPart(
    context,
    parent,
    zCylinder(CRANK.shaft, CRANK.shaftFrom, CRANK.shaftTo, 0, CRANK_Y),
    'crankshaft',
    'steel',
  );
  label(context, 'crankshaft', crank, [0, 0, ROD.thickness / 2 + CRANK.webThickness]);

  const rod = namedGroup('rod', parent);
  addPart(
    context,
    rod,
    extrudeAlongZ(rodShape(), { from: -ROD.thickness / 2, to: ROD.thickness / 2 }, 0.0008),
    'connectingRod',
  );
  label(context, 'connectingRod', rod, [0, ENGINE_GEOMETRY.rod * 0.55, ROD.thickness / 2]);

  const piston = namedGroup('piston', parent);
  const pistonHalves = {
    back: namedGroup('pistonBack', piston),
    front: namedGroup('pistonFront', piston),
  };
  HALF_IDS.forEach((id) => {
    addPart(context, pistonHalves[id], pistonHalf(HALVES[id]), 'piston');
    addPart(context, pistonHalves[id], wristPin(id), 'piston', 'steel');
  });
  label(context, 'piston', pistonHalves.back, [PISTON.radius * 0.55, -CROWN_SLAB / 2, 0]);

  const casing = {
    back: namedGroup('crankcaseBack', parent),
    front: namedGroup('crankcaseFront', parent),
  };
  HALF_IDS.forEach((id) => addPart(context, casing[id], crankcaseHalf(id), 'crankcase'));
  label(context, 'crankcase', casing.back, [
    ENGINE_GEOMETRY.crankcase.min[0] + 0.004,
    0.075,
    -0.004,
  ]);

  return {
    fronts: [pistonHalves.front, casing.front],
    setState: (state) => {
      const angle = state.crank.angle;
      crank.rotation.z = -toRadians(angle);
      const [pinX, pinY] = crankPin(angle);
      const wristY = crownY(angle) - ENGINE_GEOMETRY.pinToCrown;
      rod.position.set(pinX, pinY, 0);
      rod.rotation.z = Math.atan2(pinX, wristY - pinY);
      piston.position.set(0, crownY(angle), 0);
    },
  };
}
