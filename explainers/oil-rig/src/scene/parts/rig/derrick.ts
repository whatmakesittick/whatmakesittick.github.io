import { Group, Matrix4 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { lerp } from '@core/math';
import { box } from '@core/scene/geometry/box';
import { anchorAt } from '@core/scene/parts';
import { DRILL_FLOOR_Y } from '../../../model/scale';
import { DERRICK, DERRICK_TOP, SEGMENTS } from '../../constants';
import { PAINT } from '../../finishes';
import { barGeometry, barMatrix, rodGeometry, unitBox } from '../../geometry/bars';
import type { Point } from '../../geometry/bars';
import { mergePainted } from '../../geometry/merge';
import { instancedMesh, partMesh } from '../context';
import type { PartContext } from '../context';

export interface DerrickPart {
  object: Group;
  anchor: Object3D;
}

interface Member {
  from: Point;
  to: Point;
  width: number;
}

type Face = readonly [sx: number, sz: number, alongX: boolean];

const PANEL = DERRICK.height / DERRICK.panels;
const FACES: readonly Face[] = [
  [1, 1, true],
  [1, -1, true],
  [1, 1, false],
  [-1, 1, false],
];
const V_DOOR_FACE: Face = [-1, 1, false];
const RAIL_STRUT_LEVELS = [2, 4, 6];
const CROWN_FRAME = { height: 4, spread: 1.8 } as const;
const LABEL_HEIGHT = 9;
const WALKWAY = { width: 1.2, thickness: 0.3, margin: 0.6, finger: 0.12 } as const;

function halfWidthAt(level: number): number {
  return lerp(DERRICK.baseHalf, DERRICK.topHalf, level / DERRICK.panels);
}

function levelY(level: number): number {
  return DRILL_FLOOR_Y + level * PANEL;
}

function corner(level: number, sx: number, sz: number): Point {
  const half = halfWidthAt(level);
  return [sx * half, levelY(level), sz * half];
}

function faceCorners(face: Face, level: number): [Point, Point] {
  const [sx, sz, alongX] = face;
  return alongX
    ? [corner(level, -1, sz), corner(level, 1, sz)]
    : [corner(level, sx, -1), corner(level, sx, 1)];
}

function isVDoor(face: Face): boolean {
  return face[0] === V_DOOR_FACE[0] && face[2] === V_DOOR_FACE[2];
}

function faceMembers(face: Face): Member[] {
  const members: Member[] = [];
  for (let level = 0; level < DERRICK.panels; level++) {
    const [a, b] = faceCorners(face, level);
    const [c, d] = faceCorners(face, level + 1);
    const opening = isVDoor(face) && level < DERRICK.vDoorPanels;
    if (!opening) members.push({ from: a, to: b, width: DERRICK.bar });
    if (!opening) {
      members.push({ from: a, to: d, width: DERRICK.bar }, { from: b, to: c, width: DERRICK.bar });
    }
  }
  const [top1, top2] = faceCorners(face, DERRICK.panels);
  members.push({ from: top1, to: top2, width: DERRICK.bar });
  if (isVDoor(face)) members.push(...vDoorMembers(face));
  return members;
}

function vDoorMembers(face: Face): Member[] {
  const [a, b] = faceCorners(face, 0);
  const [c, d] = faceCorners(face, DERRICK.vDoorPanels);
  const apex: Point = [(c[0] + d[0]) / 2, c[1], (c[2] + d[2]) / 2];
  return [
    { from: a, to: apex, width: DERRICK.bar },
    { from: b, to: apex, width: DERRICK.bar },
  ];
}

function legMembers(): Member[] {
  return [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ].map(([sx, sz]) => ({
    from: corner(0, sx, sz),
    to: corner(DERRICK.panels, sx, sz),
    width: DERRICK.leg,
  }));
}

function latticeMembers(): Member[] {
  return [...legMembers(), ...FACES.flatMap(faceMembers)];
}

function crown(): BufferGeometry[] {
  const { half, thickness, sheaves, sheaveRadius, sheaveWidth } = DERRICK.crown;
  const top = DERRICK_TOP;
  const deck = box({
    minX: -half,
    maxX: half,
    minY: top,
    maxY: top + thickness,
    minZ: -half,
    maxZ: half,
  });
  const sheaveY = top + thickness + sheaveRadius;
  const wheels = Array.from({ length: sheaves }, (_, index) => {
    const x = (index - (sheaves - 1) / 2) * sheaveWidth * 2;
    return rodGeometry(
      [x, sheaveY, -sheaveWidth / 2],
      [x, sheaveY, sheaveWidth / 2],
      sheaveRadius,
      SEGMENTS.halfTube,
    );
  });
  const frameTop: Point = [0, top + thickness + CROWN_FRAME.height, 0];
  const frame = [-1, 1].map((side) =>
    barGeometry([side * CROWN_FRAME.spread, top + thickness, 0], frameTop, DERRICK.bar),
  );
  return [deck, ...wheels, ...frame];
}

function fingerboard(): BufferGeometry[] {
  const { height, depth, fingers } = DERRICK.fingerboard;
  const y = DRILL_FLOOR_Y + height;
  const half = halfWidthAt(height / PANEL);
  const inner = -half + WALKWAY.width;
  const walkway = box({
    minX: -half,
    maxX: inner,
    minY: y - WALKWAY.thickness,
    maxY: y,
    minZ: -half,
    maxZ: half,
  });
  const fingerY = y - WALKWAY.thickness / 2;
  const bars = Array.from({ length: fingers }, (_, index) => {
    const z = lerp(-half + WALKWAY.margin, half - WALKWAY.margin, index / (fingers - 1));
    return barGeometry([inner, fingerY, z], [inner + depth, fingerY, z], WALKWAY.finger);
  });
  return [walkway, ...bars];
}

function rails(): BufferGeometry[] {
  const { x, halfGap, size, bottom, top } = DERRICK.rails;
  const verticals = [-1, 1].map((side) =>
    barGeometry(
      [x, DRILL_FLOOR_Y + bottom, side * halfGap],
      [x, DRILL_FLOOR_Y + top, side * halfGap],
      size,
    ),
  );
  const struts = RAIL_STRUT_LEVELS.map((level) => {
    const y = levelY(level);
    return barGeometry([x, y, 0], [halfWidthAt(level), y, 0], DERRICK.bar);
  });
  return [...verticals, ...struts];
}

export function createDerrick(context: PartContext): DerrickPart {
  const object = new Group();
  const members = latticeMembers();
  const lattice = instancedMesh(context, unitBox(), 'derrick', 'steel', members.length);
  const matrix = new Matrix4();
  members.forEach((member, index) => {
    lattice.setMatrixAt(index, barMatrix(member.from, member.to, member.width, matrix));
  });
  lattice.computeBoundingSphere();
  const hardware = mergePainted([
    ...crown().map((part) => [part, PAINT.darkSteel] as const),
    ...fingerboard().map((part) => [part, PAINT.safetyYellow] as const),
    ...rails().map((part) => [part, PAINT.trim] as const),
  ]);
  object.add(lattice, partMesh(context, hardware, 'derrick', 'paintedMetal'));
  const [front] = faceCorners(FACES[0], LABEL_HEIGHT / PANEL);
  return { object, anchor: anchorAt(object, front[0] / 2, front[1], front[2]) };
}
