import { CylinderGeometry, Quaternion, Shape, ShapeGeometry, Vector2, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { BARREL, CLEANING_ROD, GAS_BLOCK, GAS_CYLINDER, GAS_TUBE } from '../../model/layout';
import {
  BARREL_OUTLINE,
  BEVELS,
  BORE_RADIUS,
  CLEARANCE,
  CUT_DECAL_LIFT,
  GAS_BLOCK_SHAPE,
  GAS_PORT_DECAL,
  GAS_TUBE_BORE,
  ROD_BORE,
  SEGMENTS,
  VENT_HOLE,
} from '../constants';
import { FINISHES } from '../finishes';
import { piece, sectionPiece, turnedPiece } from '../geometry/pieces';
import type { SplitPiece } from '../geometry/pieces';
import { arcPoints } from '../geometry/section';
import type { Bore, Section, SectionPoint } from '../geometry/section';
import { addPiece, partMesh } from './context';
import type { PartContext } from './context';

const ARC_STEPS = 16;
const QUARTER_TURN = Math.PI / 2;
const HOUSING_SWEEP_END = toRadians(205);
const COLLAR_SWEEP = [toRadians(150), toRadians(250)] as const;
const UP = new Vector3(0, 1, 0);

function gasBlockRim(): SectionPoint[] {
  const { collar, housing, lugRadius, lugHalfWidth } = GAS_BLOCK_SHAPE;
  const rodY = CLEANING_ROD.axisY;
  return [
    ...arcPoints([0, GAS_CYLINDER.axisY], housing, QUARTER_TURN, HOUSING_SWEEP_END, ARC_STEPS),
    ...arcPoints([0, BARREL.axisY], collar, COLLAR_SWEEP[0], COLLAR_SWEEP[1], ARC_STEPS),
    [-lugHalfWidth, rodY],
    ...arcPoints([0, rodY], lugRadius, Math.PI, 3 * QUARTER_TURN, ARC_STEPS / 2),
  ];
}

function gasBlockSection(upperBore: number): Section {
  const bores: Bore[] = [
    { y: BARREL.axisY, radius: BARREL_OUTLINE.gasBlock + CLEARANCE / 4 },
    { y: GAS_CYLINDER.axisY, radius: upperBore },
    { y: CLEANING_ROD.axisY, radius: ROD_BORE },
  ];
  return { rim: gasBlockRim(), bores };
}

function housingPiece(): SplitPiece {
  const start = GAS_BLOCK_SHAPE.lowerEndX;
  const end = GAS_BLOCK.x[1];
  const wall = GAS_CYLINDER.x[1];
  const { housing } = GAS_BLOCK_SHAPE;
  const round = GAS_BLOCK_SHAPE.frontWall * 0.75;
  return turnedPiece({
    strands: [
      [
        [start, housing],
        [end - round, housing],
      ],
      [
        [end - round, housing],
        [end, housing - round],
      ],
      [
        [end, housing - round],
        [end, 0],
      ],
      [
        [wall, 0],
        [wall, GAS_CYLINDER.radius],
      ],
      [
        [wall, GAS_CYLINDER.radius],
        [start, GAS_CYLINDER.radius],
      ],
    ],
    segments: SEGMENTS.tube,
    axisY: GAS_CYLINDER.axisY,
  });
}

function gasPortDecal(): BufferGeometry {
  const { x, angle, width, top } = GAS_PORT_DECAL;
  const run = (top - BORE_RADIUS) / Math.tan(angle);
  const half = width / 2;
  const shape = new Shape([
    new Vector2(x - half, BORE_RADIUS),
    new Vector2(x + half, BORE_RADIUS),
    new Vector2(x + half + run, top),
    new Vector2(x - half + run, top),
  ]);
  return new ShapeGeometry(shape).translate(0, 0, CUT_DECAL_LIFT);
}

function gasTubePiece(): SplitPiece {
  const [start, end] = GAS_TUBE.x;
  const outer = GAS_TUBE.radius;
  return turnedPiece({
    strands: [
      [
        [start, outer],
        [end, outer],
      ],
      [
        [end, outer],
        [end, GAS_TUBE_BORE],
      ],
      [
        [end, GAS_TUBE_BORE],
        [start, GAS_TUBE_BORE],
      ],
      [
        [start, GAS_TUBE_BORE],
        [start, outer],
      ],
    ],
    segments: SEGMENTS.tube,
    axisY: GAS_TUBE.axisY,
  });
}

function ventHole(x: number, side: number): BufferGeometry {
  const { radius, elevation } = VENT_HOLE;
  const direction = new Vector3(0, Math.sin(elevation), side * Math.cos(elevation));
  const wall = GAS_TUBE.radius - GAS_TUBE_BORE;
  const middle = (GAS_TUBE.radius + GAS_TUBE_BORE) / 2;
  const geometry = new CylinderGeometry(radius, radius, wall + 2 * CLEARANCE, SEGMENTS.rod);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction));
  return geometry.translate(x, GAS_TUBE.axisY + direction.y * middle, direction.z * middle);
}

export function addGasSystem(context: PartContext, parent: Object3D): void {
  const [start] = GAS_BLOCK.x;
  const { socketEndX, lowerEndX, socket } = GAS_BLOCK_SHAPE;
  addPiece(
    context,
    parent,
    sectionPiece(gasBlockSection(socket), [start, socketEndX], BEVELS.fine),
    'gasBlock',
    context.looks.blued,
  );
  addPiece(
    context,
    parent,
    sectionPiece(gasBlockSection(GAS_CYLINDER.radius), [socketEndX, lowerEndX], BEVELS.fine),
    'gasBlock',
    context.looks.blued,
  );
  addPiece(context, parent, housingPiece(), 'gasBlock', context.looks.blued);
  parent.add(context.cutaway.opened(partMesh(context, gasPortDecal(), 'gasPort', FINISHES.hole)));
  addPiece(context, parent, gasTubePiece(), 'gasTube', context.looks.blued);
  for (const x of VENT_HOLE.xs) {
    for (const side of [1, -1]) {
      addPiece(context, parent, piece(ventHole(x, side)), 'ventHoles', context.looks.hole);
    }
  }
}
