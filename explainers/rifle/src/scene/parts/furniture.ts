import { Shape, TorusGeometry } from 'three';
import type { Object3D } from 'three';
import { roundedRectShape } from '@core/scene/geometry/extrude';
import { BARREL, CLEANING_ROD, GAS_TUBE, RECEIVER, STOCK } from '../../model/layout';
import {
  BEVELS,
  CLEANING_ROD_HEAD,
  GRIP_SHAPE,
  HANDGUARD_GROOVES,
  HANDGUARD_RETAINER,
  HANDGUARD_VENTS,
  LOWER_HANDGUARD,
  SEGMENTS,
  SLING_LOOPS,
  STOCK_SHAPE,
  UPPER_HANDGUARD,
} from '../constants';
import { boxPiece, piece, sectionPiece, sidePiece, turnedPiece } from '../geometry/pieces';
import type { SplitPiece } from '../geometry/pieces';
import { arcPoints } from '../geometry/section';
import type { Section, SectionPoint } from '../geometry/section';
import { addPiece } from './context';
import type { PartContext } from './context';

const ARC_STEPS = 16;
const QUARTER_TURN = Math.PI / 2;
const BUTT_PLATE_BEVEL = 1.5;
const BUTT_PLATE_CORNER = 2;
const WRIST_BLEND = 25;
const PALM_SWELL = 6;
const GRIP_CORNER = 8;
const FINGER_SWELL = 3.5;

function grooved(rim: readonly SectionPoint[]): SectionPoint[] {
  const { ys, depth, width } = HANDGUARD_GROOVES;
  const result: SectionPoint[] = [];
  for (let index = 0; index < rim.length; index += 1) {
    const point = rim[index];
    result.push(point);
    const next = rim[index + 1];
    if (!next) continue;
    for (const y of ys) {
      if (!(point[1] > y + width && next[1] < y - width)) continue;
      const share = (point[1] - y) / (point[1] - next[1]);
      const z = point[0] + share * (next[0] - point[0]);
      result.push([z, y + width / 2], [z + depth, y], [z, y - width / 2]);
    }
  }
  return result;
}

const LOWER_HANDGUARD_RIM: readonly SectionPoint[] = [
  [0, 12],
  [-11, 12],
  [-13.6, 11],
  [-15.4, 8.5],
  [-17.2, 2],
  [-18, -6],
  [-17.6, -13],
  [-15.8, -19],
  [-12, -23.5],
  [-6, -25.6],
  [0, -26],
];

const RETAINER_RIM: readonly SectionPoint[] = [
  [0, 11],
  [-12, 11],
  [-16, 6],
  [-17, -6],
  [-15, -18],
  [-8, -24],
  [0, -25],
];

function stockShape(): Shape {
  const { frontTop, heel, toe, wristBottom, wristX, buttPlate, corner } = STOCK_SHAPE;
  const front = RECEIVER.x[0];
  const butt = STOCK.x[0] + buttPlate;
  const shape = new Shape();
  shape.moveTo(front, frontTop);
  shape.lineTo(butt + corner, heel);
  shape.quadraticCurveTo(butt, heel, butt, heel - corner);
  shape.lineTo(butt, toe + corner);
  shape.quadraticCurveTo(butt, toe, butt + corner, toe + corner / 4);
  shape.lineTo(wristX, wristBottom);
  shape.quadraticCurveTo(wristX + WRIST_BLEND, RECEIVER.y[0] - 1.5, front, RECEIVER.y[0]);
  shape.closePath();
  return shape;
}

function buttPlateShape(): Shape {
  const { heel, toe, buttPlate } = STOCK_SHAPE;
  return roundedRectShape(
    { minA: STOCK.x[0], minB: toe - 1, maxA: STOCK.x[0] + buttPlate, maxB: heel + 0.5 },
    BUTT_PLATE_CORNER,
  );
}

function gripShape(): Shape {
  const { topFront, depth, rake, bottom } = GRIP_SHAPE;
  const top = RECEIVER.y[0];
  const shift = (top - bottom) * Math.tan(rake);
  const rearTop = topFront - depth;
  const rearBottom = rearTop - shift;
  const frontBottom = topFront - shift;
  const shape = new Shape();
  shape.moveTo(topFront, top);
  shape.lineTo(rearTop, top);
  shape.quadraticCurveTo(
    (rearTop + rearBottom) / 2 - PALM_SWELL,
    (top + bottom) / 2,
    rearBottom,
    bottom + GRIP_CORNER,
  );
  shape.quadraticCurveTo(rearBottom - 1, bottom, rearBottom + GRIP_CORNER, bottom);
  shape.lineTo(frontBottom - GRIP_CORNER / 2, bottom);
  shape.quadraticCurveTo(frontBottom + 2, bottom, frontBottom + 2, bottom + GRIP_CORNER);
  shape.quadraticCurveTo(
    (frontBottom + topFront) / 2 + FINGER_SWELL,
    (top + bottom) / 2,
    topFront,
    top,
  );
  return shape;
}

function upperHandguardSection(): Section {
  const { outer, inner, outerSweep, innerSweep } = UPPER_HANDGUARD;
  const axis = GAS_TUBE.axisY;
  return {
    rim: [
      ...arcPoints([0, axis], outer, QUARTER_TURN, QUARTER_TURN + outerSweep, ARC_STEPS),
      ...arcPoints([0, axis], inner, QUARTER_TURN + innerSweep, QUARTER_TURN, ARC_STEPS),
    ],
  };
}

function lowerSection(rim: readonly SectionPoint[]): Section {
  return {
    rim,
    bores: [
      { y: BARREL.axisY, radius: LOWER_HANDGUARD.barrelBore },
      { y: CLEANING_ROD.axisY, radius: LOWER_HANDGUARD.rodBore },
    ],
  };
}

function cleaningRodPiece(): SplitPiece {
  const [start, end] = CLEANING_ROD.x;
  const { radius } = CLEANING_ROD;
  const head = CLEANING_ROD_HEAD;
  const step = 2;
  return turnedPiece({
    strands: [
      [
        [start, 0],
        [start, radius - 0.5],
      ],
      [
        [start, radius - 0.5],
        [start + 1, radius],
      ],
      [
        [start + 1, radius],
        [head.x[0], radius],
      ],
      [
        [head.x[0], radius],
        [head.x[0] + step, head.radius],
      ],
      [
        [head.x[0] + step, head.radius],
        [head.x[1] - step, head.radius],
      ],
      [
        [head.x[1] - step, head.radius],
        [head.x[1], radius],
      ],
      [
        [head.x[1], radius],
        [end - 1, radius],
      ],
      [
        [end - 1, radius],
        [end, head.tipRadius],
      ],
      [
        [end, head.tipRadius],
        [end, 0],
      ],
    ],
    segments: SEGMENTS.rod,
    axisY: CLEANING_ROD.axisY,
  });
}

function addSlingLoops(context: PartContext, parent: Object3D): void {
  for (const loop of [SLING_LOOPS.rear, SLING_LOOPS.front]) {
    const [x, y, z] = loop.centre;
    const ring = new TorusGeometry(loop.radius, loop.tube, SEGMENTS.rod / 2, SLING_LOOPS.segments);
    ring.rotateX(QUARTER_TURN).translate(x, y, z - loop.radius + loop.tube);
    addPiece(context, parent, piece(ring), 'stock', context.looks.blued);
  }
}

function addHandguardVents(context: PartContext, parent: Object3D): void {
  const [length, height, depth] = HANDGUARD_VENTS.size;
  const radius = UPPER_HANDGUARD.outer - depth / 3;
  for (const x of HANDGUARD_VENTS.xs) {
    for (const side of [-1, 1]) {
      const angle = HANDGUARD_VENTS.angle;
      const y = GAS_TUBE.axisY + radius * Math.cos(angle);
      const z = side * radius * Math.sin(angle);
      const slot = boxPiece(
        {
          x: [x - length / 2, x + length / 2],
          y: [y - height / 2, y + height / 2],
          z: [z - depth / 2, z + depth / 2],
        },
        height / 2,
      );
      addPiece(context, parent, slot, 'handguard', context.looks.hole);
    }
  }
}

export function addFurniture(context: PartContext, parent: Object3D): void {
  const { halfWidth, bevel } = STOCK_SHAPE;
  addPiece(
    context,
    parent,
    sidePiece(stockShape(), [-halfWidth, halfWidth], bevel),
    'stock',
    context.looks.stock,
  );
  addPiece(
    context,
    parent,
    sidePiece(buttPlateShape(), [-halfWidth - 0.5, halfWidth + 0.5], BUTT_PLATE_BEVEL),
    'stock',
    context.looks.blued,
  );
  addPiece(
    context,
    parent,
    sidePiece(gripShape(), [-GRIP_SHAPE.halfWidth, GRIP_SHAPE.halfWidth], GRIP_SHAPE.bevel),
    'grip',
    context.looks.bakelite,
  );
  addPiece(
    context,
    parent,
    sectionPiece(upperHandguardSection(), UPPER_HANDGUARD.x, BEVELS.wood),
    'handguard',
    context.looks.handguard,
  );
  addPiece(
    context,
    parent,
    sectionPiece(lowerSection(grooved(LOWER_HANDGUARD_RIM)), LOWER_HANDGUARD.x, BEVELS.wood),
    'handguard',
    context.looks.handguard,
  );
  addPiece(
    context,
    parent,
    sectionPiece(lowerSection(RETAINER_RIM), HANDGUARD_RETAINER.x, BEVELS.fine),
    'handguard',
    context.looks.blued,
  );
  addPiece(context, parent, cleaningRodPiece(), 'cleaningRod', context.looks.steel);
  addSlingLoops(context, parent);
  addHandguardVents(context, parent);
}
