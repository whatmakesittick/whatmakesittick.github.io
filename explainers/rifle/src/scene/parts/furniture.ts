import { Shape } from 'three';
import type { Object3D } from 'three';
import { roundedRectShape } from '@core/scene/geometry/extrude';
import { BARREL, CLEANING_ROD, GAS_TUBE, RECEIVER, STOCK } from '../../model/layout';
import {
  CLEANING_ROD_HEAD,
  GRIP_SHAPE,
  HANDGUARD_RETAINER,
  LOWER_HANDGUARD,
  SEGMENTS,
  STOCK_SHAPE,
  UPPER_HANDGUARD,
} from '../constants';
import { sectionPiece, sidePiece, turnedPiece } from '../geometry/pieces';
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
  shape.closePath();
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
    sectionPiece(upperHandguardSection(), UPPER_HANDGUARD.x),
    'handguard',
    context.looks.handguard,
  );
  addPiece(
    context,
    parent,
    sectionPiece(lowerSection(LOWER_HANDGUARD_RIM), LOWER_HANDGUARD.x),
    'handguard',
    context.looks.handguard,
  );
  addPiece(
    context,
    parent,
    sectionPiece(lowerSection(RETAINER_RIM), HANDGUARD_RETAINER.x),
    'handguard',
    context.looks.blued,
  );
  addPiece(context, parent, cleaningRodPiece(), 'cleaningRod', context.looks.steel);
}
