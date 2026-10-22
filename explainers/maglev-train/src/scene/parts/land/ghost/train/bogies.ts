import { CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { box } from '@core/scene/geometry/box';
import { SIDE_SIGNS } from '../../../../../model';
import { RAIL } from '../constants';
import { rod } from '../geometry/rod';
import { BOGIE } from './constants';

const QUARTER_TURN = Math.PI / 2;
const AXLE_SIGNS = [-1, 1] as const;

function wheel(x: number, side: number): BufferGeometry {
  const { wheelRadius, wheelWidth, wheelSegments } = BOGIE;
  const geometry = new CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, wheelSegments);
  geometry.rotateX(QUARTER_TURN);
  geometry.translate(x, wheelRadius, side * RAIL.centreZ);
  return geometry;
}

function axle(x: number): BufferGeometry {
  const y = BOGIE.wheelRadius;
  return rod({
    from: [x, y, -RAIL.centreZ],
    to: [x, y, RAIL.centreZ],
    radius: BOGIE.axleRadius,
    sides: BOGIE.axleSides,
  });
}

function sideFrame(side: number): BufferGeometry {
  const { halfLength, bottom, top, width, offset } = BOGIE.sideFrame;
  const z = side * offset;
  return box({
    minX: -halfLength,
    maxX: halfLength,
    minY: bottom,
    maxY: top,
    minZ: z - width / 2,
    maxZ: z + width / 2,
  });
}

function bolster(): BufferGeometry {
  const { halfLength, bottom, top } = BOGIE.bolster;
  const reach = BOGIE.sideFrame.offset;
  return box({
    minX: -halfLength,
    maxX: halfLength,
    minY: bottom,
    maxY: top,
    minZ: -reach,
    maxZ: reach,
  });
}

function wheelset(x: number): BufferGeometry[] {
  return [...SIDE_SIGNS.map((side) => wheel(x, side)), axle(x)];
}

export function bogie(centre: number): BufferGeometry[] {
  const axles = AXLE_SIGNS.map((sign) => (sign * BOGIE.wheelbase) / 2);
  const parts = [...axles.flatMap(wheelset), ...SIDE_SIGNS.map(sideFrame), bolster()];
  return parts.map((part) => part.translate(centre, 0, 0));
}
