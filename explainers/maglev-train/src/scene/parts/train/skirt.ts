import { Shape } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { Extent } from '@core/scene/regions';
import { roundedRectShape } from '@core/scene/geometry/extrude';
import { CUT_X } from '../../../model';
import { FINISHES } from '../../finishes';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { ARM, JOINT, SKIRT } from './constants';
import { bevelledAlongX, bevelledAlongZ } from './extrude';
import { cutInstances, showAhead } from './instances';
import type { CutInstances } from './instances';
import { LEAD_SECTION, TAIL_SECTION, TRAIN_LAYOUT, isAhead } from './layout';
import type { SectionLayout } from './layout';
import { mergeAll, mirroredPair } from './mirror';

const NOSE_PIECE = 0.9;
const END_MARGIN = 0.05;

interface Piece {
  from: number;
  to: number;
  top: number;
}

function skirtExtent(layout: SectionLayout, index: number): Extent {
  const modules = layout.modules;
  const rear =
    index === TAIL_SECTION ? modules[0][0] - END_MARGIN : layout.extent[0] + JOINT.halfGap;
  const front =
    index === LEAD_SECTION
      ? modules[modules.length - 1][1] + END_MARGIN
      : layout.extent[1] - JOINT.halfGap;
  return [rear, front];
}

export function skirtPieces(extent: Extent, notches: readonly number[]): Piece[] {
  const marks = notches
    .flatMap((x) => [x - SKIRT.notchHalfLength, x + SKIRT.notchHalfLength])
    .concat(extent[0] < CUT_X && extent[1] > CUT_X ? [CUT_X] : [])
    .sort((a, b) => a - b);
  const edges = [extent[0], ...marks, extent[1]];
  return edges.slice(0, -1).map((from, index) => {
    const to = edges[index + 1];
    const middle = (from + to) / 2;
    const notched = notches.some((x) => Math.abs(middle - x) < SKIRT.notchHalfLength);
    return { from, to, top: notched ? SKIRT.notchBottom : SKIRT.top };
  });
}

function profile(top: number): Shape {
  return roundedRectShape(
    { minA: SKIRT.innerZ, maxA: SKIRT.outerZ, minB: SKIRT.bottom, maxB: top },
    SKIRT.outerRadius,
  );
}

function nosePiece(from: number, to: number, forward: boolean): BufferGeometry {
  const radius = SKIRT.noseRadius;
  const shape = new Shape();
  const [rear, front] = forward ? [from, to] : [to, from];
  const sign = forward ? 1 : -1;
  shape.moveTo(rear, SKIRT.bottom);
  shape.lineTo(front - sign * radius, SKIRT.bottom);
  shape.quadraticCurveTo(front, SKIRT.bottom, front, SKIRT.bottom + radius);
  shape.lineTo(front, SKIRT.top);
  shape.lineTo(rear, SKIRT.top);
  shape.closePath();
  return bevelledAlongZ(shape, SKIRT.innerZ, SKIRT.outerZ, SKIRT.bevel);
}

function pieceGeometry(piece: Piece): BufferGeometry {
  return bevelledAlongX(profile(piece.top), piece.from, piece.to, SKIRT.bevel);
}

function sectionSkirt(layout: SectionLayout, index: number): Map<boolean, BufferGeometry[]> {
  const [rear, front] = skirtExtent(layout, index);
  const noseFront = index === LEAD_SECTION;
  const noseRear = index === TAIL_SECTION;
  const inner: Extent = [
    noseRear ? rear + NOSE_PIECE : rear,
    noseFront ? front - NOSE_PIECE : front,
  ];
  const byCut = new Map<boolean, BufferGeometry[]>([
    [false, []],
    [true, []],
  ]);
  const add = (geometry: BufferGeometry, x: number) => byCut.get(isAhead(x))?.push(geometry);
  skirtPieces(inner, layout.skids).forEach((piece) =>
    add(pieceGeometry(piece), (piece.from + piece.to) / 2),
  );
  if (noseFront) add(nosePiece(inner[1], front, true), front);
  if (noseRear) add(nosePiece(rear, inner[0], false), rear);
  return byCut;
}

export function armProfile(top: number = SKIRT.bottom + ARM.overlap): Shape {
  const { bottom, footInnerZ, frameTop, frameOuterZ, stepY, cornerRadius, tipRadius } = ARM;
  const outer = SKIRT.outerZ;
  const shape = new Shape();
  shape.moveTo(outer, top);
  shape.lineTo(outer, bottom + cornerRadius);
  shape.quadraticCurveTo(outer, bottom, outer - cornerRadius, bottom);
  shape.lineTo(footInnerZ + tipRadius, bottom);
  shape.quadraticCurveTo(footInnerZ, bottom, footInnerZ, bottom + tipRadius);
  shape.lineTo(footInnerZ, frameTop);
  shape.lineTo(frameOuterZ, frameTop);
  shape.lineTo(frameOuterZ, stepY);
  shape.lineTo(SKIRT.innerZ, stepY);
  shape.lineTo(SKIRT.innerZ, top);
  shape.closePath();
  return shape;
}

export function armGeometry(): BufferGeometry {
  const half = ARM.length / 2;
  return mirroredPair(bevelledAlongX(armProfile(), -half, half, ARM.bevel));
}

export interface Skirt {
  readonly arms: CutInstances;
  showAhead(shown: boolean): void;
}

export function buildSkirt(context: PartContext, behind: Object3D, ahead: Object3D): Skirt {
  const pieces = { behind: [] as BufferGeometry[], ahead: [] as BufferGeometry[] };
  TRAIN_LAYOUT.forEach((layout, index) => {
    const split = sectionSkirt(layout, index);
    pieces.behind.push(...(split.get(false) ?? []));
    pieces.ahead.push(...(split.get(true) ?? []));
  });
  const sides = (list: BufferGeometry[]) => mirroredPair(mergeAll(list));
  behind.add(partMesh(context, sides(pieces.behind), 'wrapArms'));
  if (pieces.ahead.length > 0) ahead.add(partMesh(context, sides(pieces.ahead), 'wrapArms'));
  const slots = TRAIN_LAYOUT.flatMap((layout) => layout.arms);
  const arms = cutInstances(context, armGeometry(), 'wrapArms', FINISHES.trainWhite, slots);
  behind.add(arms.mesh);
  return { arms, showAhead: (shown) => showAhead(arms, shown) };
}
