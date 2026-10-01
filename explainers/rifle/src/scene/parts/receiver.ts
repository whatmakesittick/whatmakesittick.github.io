import { CylinderGeometry, Shape, SphereGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { EJECTION_PORT, MAGAZINE, RECEIVER, TRIGGER_GUARD, TRUNNION } from '../../model/layout';
import type { Box, Extent } from '../../model/scale';
import {
  BEVELS,
  CLEARANCE,
  DOMED_RIVETS,
  DUST_COVER,
  DUST_COVER_RIBS,
  EJECTOR_BLOCK,
  MAGAZINE_CATCH,
  PIN_HEADS,
  RECEIVER_SHELL,
  SEGMENTS,
  SHEET,
  TRIGGER_GUARD_SHAPE,
  TRUNNION_SHAPE,
  WELL_PANEL,
} from '../constants';
import { boxPiece, piece, sectionPiece, sidePiece } from '../geometry/pieces';
import { arcPoints } from '../geometry/section';
import type { Section, SectionPoint } from '../geometry/section';
import { addPiece } from './context';
import type { PartContext } from './context';

const ARC_STEPS = 10;
const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = Math.PI * 2;
const END_PLATE = 2;

function leftWallShape(): Shape {
  const [rear, front] = RECEIVER.x;
  const shape = new Shape();
  shape.moveTo(rear, RECEIVER.y[0]);
  shape.lineTo(front, RECEIVER.y[0]);
  shape.lineTo(front, RECEIVER_SHELL.sideTop);
  shape.lineTo(rear, RECEIVER_SHELL.sideTop);
  shape.closePath();
  return shape;
}

function rightWallShape(): Shape {
  const [rear, front] = RECEIVER.x;
  const { sideTop, slot } = RECEIVER_SHELL;
  const shape = new Shape();
  shape.moveTo(rear, RECEIVER.y[0]);
  shape.lineTo(front, RECEIVER.y[0]);
  shape.lineTo(front, sideTop);
  shape.lineTo(EJECTION_PORT.x[1], sideTop);
  shape.lineTo(EJECTION_PORT.x[1], EJECTION_PORT.y[0]);
  shape.lineTo(EJECTION_PORT.x[0], EJECTION_PORT.y[0]);
  shape.lineTo(EJECTION_PORT.x[0], slot.bottom);
  shape.lineTo(slot.x[0], slot.bottom);
  shape.lineTo(slot.x[0], sideTop);
  shape.lineTo(rear, sideTop);
  shape.closePath();
  return shape;
}

function floorBoxes(): Box[] {
  const [rear, front] = RECEIVER.x;
  const { inner, floorTop, triggerOpening } = RECEIVER_SHELL;
  const y: Extent = [RECEIVER.y[0], floorTop];
  const full = (x: Extent): Box => ({ x, y, z: [-inner, inner] });
  const sides = (x: Extent, gap: number): Box[] => [
    { x, y, z: [-inner, -gap] },
    { x, y, z: [gap, inner] },
  ];
  const well = MAGAZINE.well;
  return [
    full([rear, triggerOpening.x[0]]),
    ...sides(triggerOpening.x, triggerOpening.halfWidth),
    full([triggerOpening.x[1], well.x[0]]),
    ...sides(well.x, well.z[1]),
    full([well.x[1], front]),
  ];
}

function coverRim(): SectionPoint[] {
  const { top, sideBottom, halfWidth, corner } = DUST_COVER;
  const centre: SectionPoint = [-halfWidth + corner, top - corner];
  return [
    [0, top],
    ...arcPoints(centre, corner, QUARTER_TURN, Math.PI, ARC_STEPS),
    [-halfWidth, sideBottom],
    [-halfWidth + SHEET, sideBottom],
    ...arcPoints(centre, corner - SHEET, Math.PI, QUARTER_TURN, ARC_STEPS),
    [0, top - SHEET],
  ];
}

function coverEndRim(): SectionPoint[] {
  const { top, sideBottom, halfWidth, corner } = DUST_COVER;
  return [
    [0, top],
    ...arcPoints([-halfWidth + corner, top - corner], corner, QUARTER_TURN, Math.PI, ARC_STEPS),
    [-halfWidth, sideBottom],
    [0, sideBottom],
  ];
}

function trunnionSection(): Section {
  const { corner, bore, channelHalfWidth, channelFloor } = TRUNNION_SHAPE;
  const [bottom, top] = TRUNNION.y;
  const side = TRUNNION.z[0];
  return {
    rim: [
      [0, channelFloor],
      [-channelHalfWidth, channelFloor],
      [-channelHalfWidth, top],
      ...arcPoints([side + corner, top - corner], corner, QUARTER_TURN, Math.PI, ARC_STEPS),
      ...arcPoints([side + corner, bottom + corner], corner, Math.PI, 3 * QUARTER_TURN, ARC_STEPS),
      [0, bottom],
    ],
    bores: [{ y: 0, radius: bore + CLEARANCE / 4 }],
  };
}

function triggerGuardShape(): Shape {
  const { thickness, corner, gap } = TRIGGER_GUARD_SHAPE;
  const [rear, front] = TRIGGER_GUARD.x;
  const top = RECEIVER.y[0] - gap;
  const bottom = TRIGGER_GUARD.y[0];
  const shape = new Shape();
  shape.moveTo(rear, top);
  shape.lineTo(rear, bottom + corner);
  shape.absarc(rear + corner, bottom + corner, corner, Math.PI, 3 * QUARTER_TURN, false);
  shape.lineTo(front - corner, bottom);
  shape.absarc(front - corner, bottom + corner, corner, 3 * QUARTER_TURN, 2 * Math.PI, false);
  shape.lineTo(front, top);
  shape.lineTo(front - thickness, top);
  shape.lineTo(front - thickness, bottom + corner);
  shape.absarc(front - corner, bottom + corner, corner - thickness, 0, -QUARTER_TURN, true);
  shape.lineTo(rear + corner, bottom + thickness);
  shape.absarc(rear + corner, bottom + corner, corner - thickness, -QUARTER_TURN, -Math.PI, true);
  shape.lineTo(rear + thickness, top);
  shape.closePath();
  return shape;
}

function addTriggerGuard(context: PartContext, parent: Object3D): void {
  const { halfWidth, gap, strapEndX } = TRIGGER_GUARD_SHAPE;
  const look = context.looks.blued;
  addPiece(
    context,
    parent,
    sidePiece(triggerGuardShape(), [-halfWidth, halfWidth]),
    'receiver',
    look,
  );
  const strap: Box = {
    x: [TRIGGER_GUARD.x[1], strapEndX],
    y: [RECEIVER.y[0] - gap - SHEET, RECEIVER.y[0] - gap],
    z: [-halfWidth, halfWidth],
  };
  addPiece(context, parent, boxPiece(strap, BEVELS.round), 'receiver', look);
  addPiece(context, parent, boxPiece(MAGAZINE_CATCH, BEVELS.block), 'receiver', look);
}

function sideStud(geometry: BufferGeometry, x: number, y: number, side: number): BufferGeometry {
  return geometry.translate(x, y, side * RECEIVER_SHELL.outer);
}

function addStuds(context: PartContext, parent: Object3D): void {
  const look = context.looks.blued;
  for (const side of [-1, 1]) {
    for (const [x, y] of DOMED_RIVETS.points) {
      const dome = new SphereGeometry(
        DOMED_RIVETS.radius,
        SEGMENTS.rod,
        SEGMENTS.rod / 2,
        0,
        FULL_TURN,
        0,
        QUARTER_TURN,
      );
      dome.rotateX(side * QUARTER_TURN).scale(1, 1, DOMED_RIVETS.flatten);
      addPiece(context, parent, piece(sideStud(dome, x, y, side)), 'receiver', look);
    }
    for (const [x, y] of PIN_HEADS.points) {
      const head = new CylinderGeometry(
        PIN_HEADS.radius,
        PIN_HEADS.radius,
        PIN_HEADS.height,
        SEGMENTS.rod,
      );
      head.rotateX(QUARTER_TURN).translate(0, 0, (side * PIN_HEADS.height) / 2);
      addPiece(context, parent, piece(sideStud(head, x, y, side)), 'receiver', look);
    }
    const panel = WELL_PANEL.z;
    const z =
      side > 0
        ? ([outerFace(panel[0]), outerFace(panel[1])] as const)
        : ([-outerFace(panel[1]), -outerFace(panel[0])] as const);
    addPiece(context, parent, boxPiece({ ...WELL_PANEL, z }, BEVELS.fine), 'receiver', look);
  }
}

function outerFace(offset: number): number {
  return RECEIVER_SHELL.outer + offset;
}

function ribRim(): SectionPoint[] {
  const { top, sideBottom, halfWidth, corner } = DUST_COVER;
  const { height, lift } = DUST_COVER_RIBS;
  const centre: SectionPoint = [-halfWidth + corner, top - corner];
  return [
    [0, top + height],
    ...arcPoints(centre, corner + height, QUARTER_TURN, Math.PI, ARC_STEPS),
    [-halfWidth - height, sideBottom + lift],
    [-halfWidth, sideBottom + lift],
    ...arcPoints(centre, corner, Math.PI, QUARTER_TURN, ARC_STEPS),
    [0, top],
  ];
}

function addDustCover(context: PartContext, parent: Object3D): void {
  const look = context.looks.blued;
  const [coverRear, coverFront] = DUST_COVER.x;
  const cover = (rim: SectionPoint[], x: readonly [number, number]) =>
    addPiece(context, parent, sectionPiece({ rim }, x, BEVELS.cover), 'receiver', look);
  cover(coverEndRim(), [coverRear, coverRear + END_PLATE]);
  cover(coverRim(), [coverRear + END_PLATE, coverFront]);
  const half = DUST_COVER_RIBS.width / 2;
  for (const x of DUST_COVER_RIBS.xs) cover(ribRim(), [x - half, x + half]);
}

export function addReceiver(context: PartContext, parent: Object3D): void {
  const look = context.looks.blued;
  const { outer, inner, rearTrunnion, sideTop } = RECEIVER_SHELL;
  const walls = [
    { shape: leftWallShape(), z: [-outer, -inner] as const },
    { shape: rightWallShape(), z: [inner, outer] as const },
  ];
  for (const { shape, z } of walls) {
    addPiece(context, parent, sidePiece(shape, z, BEVELS.wall), 'receiver', look);
  }
  for (const floor of floorBoxes()) addPiece(context, parent, boxPiece(floor), 'receiver', look);
  addPiece(
    context,
    parent,
    boxPiece({ x: rearTrunnion, y: [RECEIVER_SHELL.floorTop, sideTop], z: [-inner, inner] }),
    'receiver',
    look,
  );
  addDustCover(context, parent);
  addPiece(
    context,
    parent,
    sectionPiece(trunnionSection(), TRUNNION.x, BEVELS.block),
    'trunnion',
    look,
  );
  addPiece(context, parent, boxPiece(EJECTOR_BLOCK, BEVELS.round), 'ejector', look);
  addTriggerGuard(context, parent);
  addStuds(context, parent);
}
