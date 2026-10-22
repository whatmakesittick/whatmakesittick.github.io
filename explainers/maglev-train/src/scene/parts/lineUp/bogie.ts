import { CylinderGeometry, LatheGeometry, Matrix4, Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { SIDE_SIGNS } from '../../../model';
import { finishMesh } from '../context';
import type { PartContext } from '../context';
import { merged } from '../inset/strokes';
import { WHEEL_RAIL } from './constants';
import { instances } from './cut';
import { LINE_UP_FINISHES } from './finishes';

const PART = 'wheelRail';
const QUARTER_TURN = Math.PI / 2;
const HALF_TURN = Math.PI;
const ROUND_SEGMENTS = 20;
const AXLE_REACH = 1.1;

const WHEEL_PROFILE: readonly (readonly [radius: number, axial: number])[] = [
  [0.08, -0.03],
  [0.16, -0.03],
  [0.19, 0.025],
  [0.4, 0.025],
  [0.42, 0],
  [0.48, 0],
  [0.49, 0.012],
  [0.475, 0.03],
  [0.46, 0.042],
  [0.452, 0.135],
  [0.42, 0.135],
  [0.4, 0.11],
  [0.19, 0.11],
  [0.16, 0.16],
  [0.08, 0.16],
];

const { axle, bogie, wheel } = WHEEL_RAIL;
const BOGIE_CENTRE = (axle.xs[0] + axle.xs[1]) / 2;

function wheelGeometry(): BufferGeometry {
  const points = WHEEL_PROFILE.map(([radius, axial]) => new Vector2(radius, axial));
  const geometry = new LatheGeometry(points, wheel.segments);
  geometry.rotateX(QUARTER_TURN);
  geometry.translate(0, 0, wheel.backToBack / 2);
  return geometry;
}

function wheelMatrices(): Matrix4[] {
  const turned = new Matrix4().makeRotationY(HALF_TURN);
  return axle.xs.flatMap((x) => {
    const place = new Matrix4().makeTranslation(x, axle.y, 0);
    return [place, place.clone().multiply(turned)];
  });
}

function crossCylinder(radius: number, length: number): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, length, ROUND_SEGMENTS);
  geometry.rotateX(QUARTER_TURN);
  return geometry;
}

function frameGeometry(): BufferGeometry {
  const { sideA, frameWidth, frameBelow, frameAbove, overhang, transomWidth, axleBox } = bogie;
  const minX = axle.xs[0] - overhang;
  const maxX = axle.xs[1] + overhang;
  const sides = SIDE_SIGNS.map((side) =>
    box({
      minX,
      maxX,
      minY: axle.y - frameBelow,
      maxY: axle.y + frameAbove,
      minZ: side * sideA - frameWidth / 2,
      maxZ: side * sideA + frameWidth / 2,
    }),
  );
  const transom = box({
    minX: BOGIE_CENTRE - transomWidth / 2,
    maxX: BOGIE_CENTRE + transomWidth / 2,
    minY: axle.y,
    maxY: axle.y + frameAbove,
    minZ: -sideA,
    maxZ: sideA,
  });
  const boxes = axle.xs.flatMap((x) =>
    SIDE_SIGNS.map((side) =>
      box({
        minX: x - axleBox.half,
        maxX: x + axleBox.half,
        minY: axle.y - axleBox.halfHeight,
        maxY: axle.y + axleBox.halfHeight,
        minZ: side > 0 ? axleBox.inner : -axleBox.outer,
        maxZ: side > 0 ? axleBox.outer : -axleBox.inner,
      }),
    ),
  );
  const parts = [...sides, transom, ...boxes];
  return merged(parts);
}

function airSprings(context: PartContext): Object3D {
  const top = WHEEL_RAIL.bottom;
  const bottom = axle.y + bogie.frameAbove;
  const geometry = new CylinderGeometry(
    bogie.airSpringRadius,
    bogie.airSpringRadius,
    top - bottom,
    ROUND_SEGMENTS,
  );
  const matrices = SIDE_SIGNS.map((side) =>
    new Matrix4().makeTranslation(BOGIE_CENTRE, (top + bottom) / 2, side * bogie.sideA),
  );
  return instances(context, geometry, PART, LINE_UP_FINISHES.airSpring, matrices);
}

export function buildBogie(context: PartContext, parent: Object3D): void {
  const axles = axle.xs.map((x) => new Matrix4().makeTranslation(x, axle.y, 0));
  const discs = axle.xs.flatMap((x) =>
    SIDE_SIGNS.map((side) => new Matrix4().makeTranslation(x, axle.y, side * bogie.discA)),
  );
  parent.add(
    instances(context, wheelGeometry(), PART, LINE_UP_FINISHES.wheel, wheelMatrices()),
    instances(
      context,
      crossCylinder(axle.radius, AXLE_REACH * 2),
      PART,
      LINE_UP_FINISHES.wheel,
      axles,
    ),
    instances(
      context,
      crossCylinder(bogie.discRadius, bogie.discThickness),
      PART,
      LINE_UP_FINISHES.rim,
      discs,
    ),
    finishMesh(context, frameGeometry(), PART, LINE_UP_FINISHES.bogie),
    airSprings(context),
  );
}
