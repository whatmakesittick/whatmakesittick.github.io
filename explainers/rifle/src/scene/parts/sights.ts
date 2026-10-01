import type { Object3D } from 'three';
import { BARREL, CLEANING_ROD, FRONT_SIGHT, GAS_TUBE, REAR_SIGHT } from '../../model/layout';
import {
  BEVELS,
  CLEARANCE,
  FRONT_SIGHT_BASE,
  REAR_SIGHT_BLOCK,
  REAR_SIGHT_LEAF,
  REAR_SIGHT_NOTCH,
  REAR_SIGHT_SLIDER,
  ROD_BORE,
} from '../constants';
import { boxPiece, sectionPiece } from '../geometry/pieces';
import { arcPoints } from '../geometry/section';
import type { Section } from '../geometry/section';
import { toRadians } from '@core/math';
import { addPiece } from './context';
import type { PartContext } from './context';

const ARC_STEPS = 12;
const QUARTER_TURN = Math.PI / 2;
const FRONT_COLLAR_SWEEP = [toRadians(120), toRadians(245)] as const;
const FRONT_NECK = { width: 6, y: 15 } as const;
const FRONT_SHOULDER = 20;
const SLIDER_WALL = 1.3;
const SLIDER_ROOF = { y: [36.2, 37.6] as const };

function rearBlockSection(): Section {
  const { top, halfWidth, corner, barrelBore, pistonBore } = REAR_SIGHT_BLOCK;
  return {
    rim: [
      [0, top],
      ...arcPoints([-halfWidth + corner, top - corner], corner, QUARTER_TURN, Math.PI, ARC_STEPS),
      ...arcPoints([0, BARREL.axisY], halfWidth, Math.PI, 3 * QUARTER_TURN, ARC_STEPS),
    ],
    bores: [
      { y: BARREL.axisY, radius: barrelBore + CLEARANCE / 4 },
      { y: GAS_TUBE.axisY, radius: pistonBore },
    ],
  };
}

function notchSection(): Section {
  const { bottom, top, halfWidth, notchHalfWidth, base } = REAR_SIGHT_NOTCH;
  return {
    rim: [
      [0, bottom],
      [-notchHalfWidth, top],
      [-halfWidth, top],
      [-halfWidth, base],
      [0, base],
    ],
  };
}

function addRearSight(context: PartContext, parent: Object3D): void {
  const look = context.looks.blued;
  addPiece(
    context,
    parent,
    sectionPiece(rearBlockSection(), REAR_SIGHT.block.x, BEVELS.block),
    'rearSight',
    look,
  );
  addPiece(
    context,
    parent,
    sectionPiece(notchSection(), REAR_SIGHT_NOTCH.x, BEVELS.fine),
    'rearSight',
    look,
  );
  addPiece(
    context,
    parent,
    boxPiece({ ...REAR_SIGHT_LEAF, x: [REAR_SIGHT_NOTCH.x[1], REAR_SIGHT_LEAF.x[1]] }, BEVELS.fine),
    'rearSight',
    look,
  );
  const { x, y, z } = REAR_SIGHT_SLIDER;
  for (const side of [-1, 1]) {
    const wall =
      side < 0 ? ([z[0], z[0] + SLIDER_WALL] as const) : ([z[1] - SLIDER_WALL, z[1]] as const);
    addPiece(context, parent, boxPiece({ x, y, z: wall }, BEVELS.fine), 'rearSight', look);
  }
  addPiece(context, parent, boxPiece({ x, y: SLIDER_ROOF.y, z }, BEVELS.fine), 'rearSight', look);
}

function frontBaseSection(): Section {
  const { top, halfWidth, collar } = FRONT_SIGHT_BASE;
  const rodY = CLEANING_ROD.axisY;
  const lugRadius = ROD_BORE + 2;
  return {
    rim: [
      [0, top],
      [-halfWidth, top],
      [-halfWidth, FRONT_SHOULDER],
      [-FRONT_NECK.width, FRONT_NECK.y],
      ...arcPoints(
        [0, BARREL.axisY],
        collar,
        FRONT_COLLAR_SWEEP[0],
        FRONT_COLLAR_SWEEP[1],
        ARC_STEPS,
      ),
      [-lugRadius, rodY],
      ...arcPoints([0, rodY], lugRadius, Math.PI, 3 * QUARTER_TURN, ARC_STEPS / 2),
    ],
    bores: [
      { y: BARREL.axisY, radius: BARREL.muzzleRadius + CLEARANCE / 4 },
      { y: rodY, radius: ROD_BORE },
    ],
  };
}

function addFrontSight(context: PartContext, parent: Object3D): void {
  const look = context.looks.blued;
  const { ears, post, top } = FRONT_SIGHT_BASE;
  addPiece(
    context,
    parent,
    sectionPiece(frontBaseSection(), FRONT_SIGHT.tower.x, BEVELS.block),
    'frontSight',
    look,
  );
  for (const side of [-1, 1]) {
    const z = side < 0 ? ([-ears.z[1], -ears.z[0]] as const) : ears.z;
    addPiece(
      context,
      parent,
      boxPiece({ x: ears.x, y: ears.y, z }, BEVELS.round),
      'frontSight',
      look,
    );
  }
  addPiece(
    context,
    parent,
    boxPiece({
      x: [FRONT_SIGHT.x - post.halfSize, FRONT_SIGHT.x + post.halfSize],
      y: [top, FRONT_SIGHT.y],
      z: [-post.halfSize, post.halfSize],
    }),
    'frontSight',
    look,
  );
}

export function addSights(context: PartContext, parent: Object3D): void {
  addRearSight(context, parent);
  addFrontSight(context, parent);
}
