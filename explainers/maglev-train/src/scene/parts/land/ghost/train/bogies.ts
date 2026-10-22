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

interface FrameBlock {
  readonly halfLength: number;
  readonly bottom: number;
  readonly top: number;
}

export interface BogieFrame {
  readonly sideFrame: FrameBlock & { readonly width: number; readonly offset: number };
  readonly bolster: FrameBlock;
}

export function bogieFrame({ sideFrame, bolster }: BogieFrame, centre = 0): BufferGeometry[] {
  const block = ({ halfLength, bottom, top }: FrameBlock, minZ: number, maxZ: number) =>
    box({
      minX: centre - halfLength,
      maxX: centre + halfLength,
      minY: bottom,
      maxY: top,
      minZ,
      maxZ,
    });
  const { width, offset } = sideFrame;
  return [
    ...SIDE_SIGNS.map((side) =>
      block(sideFrame, side * offset - width / 2, side * offset + width / 2),
    ),
    block(bolster, -offset, offset),
  ];
}

function wheelset(x: number): BufferGeometry[] {
  return [...SIDE_SIGNS.map((side) => wheel(x, side)), axle(x)];
}

export function bogie(centre: number): BufferGeometry[] {
  const axles = AXLE_SIGNS.map((sign) => (sign * BOGIE.wheelbase) / 2);
  const parts = [...axles.flatMap(wheelset), ...bogieFrame(BOGIE)];
  return parts.map((part) => part.translate(centre, 0, 0));
}
