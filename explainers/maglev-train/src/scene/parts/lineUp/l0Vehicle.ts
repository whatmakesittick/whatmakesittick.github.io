import { Matrix4 } from 'three';
import type { Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { PartContext } from '../context';
import { merged } from '../inset/strokes';
import type { Point2 } from '../inset/strokes';
import { buildBody } from './body';
import type { BodySpec } from './body';
import { CUT_FACE_LIFT, L0 } from './constants';
import { cutFaceGeometry, finishMesh, instances } from './cut';
import { LINE_UP_FINISHES } from './finishes';
import { lifted, roundedRect } from './profile';
import { SIDE_SIGNS } from '../../../model';

const PART = 'scmaglev';
const MAGNET_SEGMENTS = 2;
const MAGNET_EMBED = 0.05;
const BOX_FACES = 6;

export const L0_BODY: BodySpec = {
  outline: L0.outline,
  bottom: L0.bottom,
  shell: L0.shell,
  cabinFloor: L0.cabinFloor,
  seats: L0.seats,
  windows: L0.windows,
};

function magnetMatrices(): Matrix4[] {
  const { depth, length, centre, starts } = L0.magnet;
  const a = L0.outline.halfWidth - MAGNET_EMBED + (depth + MAGNET_EMBED) / 2;
  return starts.flatMap((start) =>
    SIDE_SIGNS.map((side) =>
      new Matrix4().makeTranslation(start + length / 2, L0.floor + centre, side * a),
    ),
  );
}

const MAGNET_FACES = [
  LINE_UP_FINISHES.cryostatCap,
  ...Array.from({ length: BOX_FACES - 1 }, () => LINE_UP_FINISHES.cryostat),
];

function coilSections(): Point2[][] {
  const { depth, centre, coilWidth, coilHeight } = L0.magnet;
  const a = L0.outline.halfWidth + depth / 2;
  const y = L0.floor + centre - L0.bottom;
  return SIDE_SIGNS.map((side): Point2[] => [
    [side * a - coilWidth / 2, y - coilHeight / 2],
    [side * a + coilWidth / 2, y - coilHeight / 2],
    [side * a + coilWidth / 2, y + coilHeight / 2],
    [side * a - coilWidth / 2, y + coilHeight / 2],
  ]);
}

function addMagnets(context: PartContext, parent: Object3D): void {
  const { depth, height, length, radius } = L0.magnet;
  const geometry = new RoundedBoxGeometry(
    length,
    height,
    depth + MAGNET_EMBED,
    MAGNET_SEGMENTS,
    radius,
  );
  parent.add(instances(context, geometry, PART, MAGNET_FACES, magnetMatrices()));
  const coils = merged(
    coilSections().map((outline) =>
      cutFaceGeometry(lifted(outline, L0.bottom), CUT_FACE_LIFT.cabin),
    ),
  );
  parent.add(finishMesh(context, coils, PART, LINE_UP_FINISHES.superconductor));
}

function wheelOutlines(inset: number): Point2[][] {
  const { sideA, width, bottom, height, radius } = L0.landingWheels;
  return SIDE_SIGNS.map((side) =>
    roundedRect(
      {
        minA: side * sideA - width / 2 + inset,
        maxA: side * sideA + width / 2 - inset,
        minB: bottom + inset,
        maxB: bottom + height - inset,
      },
      Math.max(radius - inset, 0),
    ),
  );
}

function strutOutlines(): Point2[][] {
  const { sideA, bottom, height, strutWidth } = L0.landingWheels;
  const top = L0.cabinFloor;
  return SIDE_SIGNS.map((side): Point2[] => [
    [side * sideA - strutWidth / 2, bottom + height / 2],
    [side * sideA + strutWidth / 2, bottom + height / 2],
    [side * sideA + strutWidth / 2, top],
    [side * sideA - strutWidth / 2, top],
  ]);
}

function addLandingWheels(context: PartContext, parent: Object3D): void {
  const layers = [
    { outlines: strutOutlines(), finish: LINE_UP_FINISHES.rim, lift: CUT_FACE_LIFT.detail },
    { outlines: wheelOutlines(0), finish: LINE_UP_FINISHES.rubber, lift: CUT_FACE_LIFT.accent },
    {
      outlines: wheelOutlines(L0.landingWheels.rimInset),
      finish: LINE_UP_FINISHES.rim,
      lift: CUT_FACE_LIFT.accent + CUT_FACE_LIFT.cabin,
    },
  ];
  layers.forEach(({ outlines, finish, lift }) => {
    const geometry = merged(
      outlines.map((outline) => cutFaceGeometry(lifted(outline, L0.bottom), lift)),
    );
    parent.add(finishMesh(context, geometry, PART, finish));
  });
}

export function buildL0Vehicle(context: PartContext, parent: Object3D): void {
  parent.add(buildBody(context, L0_BODY, PART));
  addMagnets(context, parent);
  addLandingWheels(context, parent);
}
