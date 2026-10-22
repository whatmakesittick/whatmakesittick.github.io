import { Shape } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { Extent } from '@core/scene/regions';
import { roundedRectShape } from '@core/scene/geometry/extrude';
import { CUT_X } from '../../../model';
import { FINISHES } from '../../finishes';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { ARM, JOINT, SKIRT } from './constants';
import { extrudeAlongX } from '../line/geometry';
import { CURVE_SEGMENTS, bevelledAlongZ } from './extrude';
import { cutInstances } from './instances';
import type { ShowAhead } from './instances';
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

type Placed = readonly [geometry: BufferGeometry, x: number];

function skirtPieces(extent: Extent, notches: readonly number[]): Piece[] {
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

function pieceGeometry({ from, to, top }: Piece): BufferGeometry {
  const profile = roundedRectShape(
    { minA: SKIRT.innerZ, maxA: SKIRT.outerZ, minB: SKIRT.bottom, maxB: top },
    SKIRT.outerRadius,
  );
  return extrudeAlongX(profile, from, to, SKIRT.bevel, CURVE_SEGMENTS);
}

function nosePiece(base: number, tip: number): BufferGeometry {
  const radius = SKIRT.noseRadius;
  const shape = new Shape();
  shape.moveTo(base, SKIRT.bottom);
  shape.lineTo(tip > base ? tip - radius : tip + radius, SKIRT.bottom);
  shape.quadraticCurveTo(tip, SKIRT.bottom, tip, SKIRT.bottom + radius);
  shape.lineTo(tip, SKIRT.top);
  shape.lineTo(base, SKIRT.top);
  shape.closePath();
  return bevelledAlongZ(shape, SKIRT.innerZ, SKIRT.outerZ, SKIRT.bevel);
}

function sectionSkirt({ extent, modules, skids }: SectionLayout, index: number): Placed[] {
  const noseFront = index === LEAD_SECTION;
  const noseRear = index === TAIL_SECTION;
  const rear = noseRear ? modules[0][0] - END_MARGIN : extent[0] + JOINT.halfGap;
  const front = noseFront ? modules[modules.length - 1][1] + END_MARGIN : extent[1] - JOINT.halfGap;
  const inner: Extent = [
    noseRear ? rear + NOSE_PIECE : rear,
    noseFront ? front - NOSE_PIECE : front,
  ];
  const placed = skirtPieces(inner, skids).map((piece): Placed => [
    pieceGeometry(piece),
    (piece.from + piece.to) / 2,
  ]);
  if (noseFront) placed.push([nosePiece(inner[1], front), front]);
  if (noseRear) placed.push([nosePiece(inner[0], rear), rear]);
  return placed;
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
  return mirroredPair(extrudeAlongX(armProfile(), -half, half, ARM.bevel, CURVE_SEGMENTS));
}

export function buildSkirt(context: PartContext, behind: Object3D, ahead: Object3D): ShowAhead {
  const pieces = TRAIN_LAYOUT.flatMap(sectionSkirt);
  [behind, ahead].forEach((parent, side) => {
    const list = pieces.filter(([, x]) => isAhead(x) === side > 0).map(([geometry]) => geometry);
    if (list.length > 0) parent.add(partMesh(context, mirroredPair(mergeAll(list)), 'wrapArms'));
  });
  const slots = TRAIN_LAYOUT.flatMap((layout) => layout.arms);
  return cutInstances(context, behind, armGeometry(), 'wrapArms', FINISHES.trainWhite, slots);
}
