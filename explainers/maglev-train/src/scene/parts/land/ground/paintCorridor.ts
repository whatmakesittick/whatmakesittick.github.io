import { SIDE_SIGNS } from '../../../../model';
import { CORRIDOR } from '../constants';
import { CORRIDOR_PAINT } from '../palette';
import { around, shrunk } from '../random';
import type { Range } from '../random';
import { shade } from './colour';
import { fillBox } from './painter';
import type { Painter } from './painter';

const REED_WIDTH = 0.6;
const JOINT_WIDTH = 0.12;

function tileRange(painter: Painter): Range {
  return [0, painter.period];
}

function mownStrip(painter: Painter): void {
  const { verge, mowStripe } = CORRIDOR;
  fillBox(painter, tileRange(painter), [-verge, verge], CORRIDOR_PAINT.mown);
  const darker = shade(CORRIDOR_PAINT.mown, CORRIDOR_PAINT.mowShade);
  for (let z = -verge; z < verge; z += mowStripe * 2)
    fillBox(painter, tileRange(painter), [z, Math.min(verge, z + mowStripe)], darker);
}

function fences(painter: Painter): void {
  const { fence, fenceWidth } = CORRIDOR;
  SIDE_SIGNS.forEach((side) =>
    fillBox(painter, tileRange(painter), around(side * fence, fenceWidth), CORRIDOR_PAINT.fence),
  );
}

function serviceRoad(painter: Painter): void {
  const tile = tileRange(painter);
  fillBox(painter, tile, [CORRIDOR.fence, CORRIDOR.service[0]], CORRIDOR_PAINT.grass);
  fillBox(painter, tile, CORRIDOR.service, CORRIDOR_PAINT.service);
  const { serviceJointSpacing } = CORRIDOR_PAINT;
  for (let x = 0; x < painter.period; x += serviceJointSpacing)
    fillBox(painter, [x, x + JOINT_WIDTH], CORRIDOR.service, CORRIDOR_PAINT.serviceJoint);
}

function ghostBed(painter: Painter): void {
  const tile = tileRange(painter);
  fillBox(painter, tile, CORRIDOR.ghostVerge, CORRIDOR_PAINT.grass);
  fillBox(painter, tile, [CORRIDOR.ghostVerge[1], -CORRIDOR.verge], CORRIDOR_PAINT.grass);
  fillBox(painter, tile, CORRIDOR.formation, CORRIDOR_PAINT.formation);
  fillBox(painter, tile, shrunk(CORRIDOR.ditch, -REED_WIDTH), CORRIDOR_PAINT.reeds);
  fillBox(painter, tile, CORRIDOR.ditch, CORRIDOR_PAINT.ditch);
}

export function paintCorridor(painter: Painter): void {
  ghostBed(painter);
  mownStrip(painter);
  serviceRoad(painter);
  fences(painter);
}
