import { CylinderGeometry, Shape } from 'three';
import type { Object3D } from 'three';
import { EJECTION_PORT, MAGAZINE, RECEIVER, TRIGGER_GUARD, TRUNNION } from '../../model/layout';
import type { Box, Extent } from '../../model/scale';
import {
  CLEARANCE,
  DUST_COVER,
  MAGAZINE_CATCH,
  RECEIVER_SHELL,
  RIVET,
  RIVETS,
  SEGMENTS,
  SHEET,
  TRIGGER_GUARD_SHAPE,
  TRUNNION_SHAPE,
} from '../constants';
import { boxPiece, piece, sectionPiece, sidePiece } from '../geometry/pieces';
import { arcPoints } from '../geometry/section';
import type { Section, SectionPoint } from '../geometry/section';
import { addPiece } from './context';
import type { PartContext } from './context';

const ARC_STEPS = 10;
const QUARTER_TURN = Math.PI / 2;
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
  addPiece(context, parent, boxPiece(strap), 'receiver', look);
  addPiece(context, parent, boxPiece(MAGAZINE_CATCH), 'receiver', look);
}

function addRivets(context: PartContext, parent: Object3D): void {
  for (const [x, y] of RIVETS) {
    for (const side of [-1, 1]) {
      const rivet = new CylinderGeometry(RIVET.radius, RIVET.radius, RIVET.height, SEGMENTS.rod);
      rivet.rotateX(QUARTER_TURN);
      rivet.translate(x, y, side * (RECEIVER_SHELL.outer + RIVET.height / 2));
      addPiece(context, parent, piece(rivet), 'receiver', context.looks.blued);
    }
  }
}

export function addReceiver(context: PartContext, parent: Object3D): void {
  const look = context.looks.blued;
  const { outer, inner, rearTrunnion, sideTop } = RECEIVER_SHELL;
  addPiece(context, parent, sidePiece(leftWallShape(), [-outer, -inner]), 'receiver', look);
  addPiece(context, parent, sidePiece(rightWallShape(), [inner, outer]), 'receiver', look);
  for (const floor of floorBoxes()) addPiece(context, parent, boxPiece(floor), 'receiver', look);
  addPiece(
    context,
    parent,
    boxPiece({ x: rearTrunnion, y: [RECEIVER_SHELL.floorTop, sideTop], z: [-inner, inner] }),
    'receiver',
    look,
  );
  const [coverRear, coverFront] = DUST_COVER.x;
  addPiece(
    context,
    parent,
    sectionPiece({ rim: coverEndRim() }, [coverRear, coverRear + END_PLATE]),
    'receiver',
    look,
  );
  addPiece(
    context,
    parent,
    sectionPiece({ rim: coverRim() }, [coverRear + END_PLATE, coverFront]),
    'receiver',
    look,
  );
  addPiece(context, parent, sectionPiece(trunnionSection(), TRUNNION.x), 'trunnion', look);
  addTriggerGuard(context, parent);
  addRivets(context, parent);
}
