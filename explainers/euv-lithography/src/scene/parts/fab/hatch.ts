import type { BufferGeometry } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { Point } from '../../../ids';
import type { Batch } from './batch';
import { AXIS_Y, disc, rod, span } from './shapes';
import { HATCH, RAIL } from './dims';

const FRAME_BOTTOM = -0.02;
const FRAME_TOP = 0.04;
const STRIP = 0.035;
const STRIP_RISE = 0.006;
const LID_THICKNESS = 0.05;
const LID_EDGE = 0.045;
const LID_EDGE_THICKNESS = 0.075;
const HINGE_RADIUS = 0.03;
const POST_RADIUS = 0.022;
const RAIL_RADIUS = 0.017;
const FOOT_RADIUS = 0.07;
const FOOT_HEIGHT = 0.015;
const TOE_BOARD = 0.1;
const BOLT_SIZE = 0.012;

function frame(batch: Batch): void {
  const { x, z, half, frame: width } = HATCH;
  const outer = half + width;
  const bars: [Point, Point][] = [
    [
      [x - outer, FRAME_BOTTOM, z - outer],
      [x - half, FRAME_TOP, z + outer],
    ],
    [
      [x + half, FRAME_BOTTOM, z - outer],
      [x + outer, FRAME_TOP, z + outer],
    ],
    [
      [x - half, FRAME_BOTTOM, z - outer],
      [x + half, FRAME_TOP, z - half],
    ],
    [
      [x - half, FRAME_BOTTOM, z + half],
      [x + half, FRAME_TOP, z + outer],
    ],
  ];
  bars.forEach(([min, max]) => batch.add(STRUCTURE_GROUP, 'hatch', span(min, max)));
  const top = FRAME_TOP + STRIP_RISE;
  const strips: [Point, Point][] = [
    [
      [x - half, FRAME_TOP, z - half],
      [x - half + STRIP, top, z + half],
    ],
    [
      [x + half - STRIP, FRAME_TOP, z - half],
      [x + half, top, z + half],
    ],
    [
      [x - half, FRAME_TOP, z + half - STRIP],
      [x + half, top, z + half],
    ],
    [
      [x - half, FRAME_TOP, z - half],
      [x + half, top, z - half + STRIP],
    ],
  ];
  strips.forEach(([min, max]) => batch.add(STRUCTURE_GROUP, 'safety', span(min, max)));
}

function lid(batch: Batch): void {
  const { x, z, half, frame: width, lidTilt } = HATCH;
  const hingeZ = z - half - width / 2;
  const reach = half * 2;
  const wide = half + width / 2;
  const place = (geometry: BufferGeometry): BufferGeometry =>
    geometry.rotateX(-lidTilt).translate(x, FRAME_TOP, hingeZ);
  const plate = span([-wide, 0, 0], [wide, LID_THICKNESS, reach]);
  batch.add(STRUCTURE_GROUP, 'hatch', place(plate));
  const edges: [Point, Point][] = [
    [
      [-wide, -LID_EDGE_THICKNESS / 4, 0],
      [-wide + LID_EDGE, LID_EDGE_THICKNESS, reach],
    ],
    [
      [wide - LID_EDGE, -LID_EDGE_THICKNESS / 4, 0],
      [wide, LID_EDGE_THICKNESS, reach],
    ],
    [
      [-wide, -LID_EDGE_THICKNESS / 4, reach - LID_EDGE],
      [wide, LID_EDGE_THICKNESS, reach],
    ],
    [
      [-wide, -LID_EDGE_THICKNESS / 4, 0],
      [wide, LID_EDGE_THICKNESS, LID_EDGE],
    ],
  ];
  edges.forEach(([min, max]) => batch.add(STRUCTURE_GROUP, 'safety', place(span(min, max))));
  batch.add(
    STRUCTURE_GROUP,
    'darkFrame',
    place(span([-wide / 2, -0.05, reach * 0.35], [wide / 2, 0, reach * 0.4])),
  );
  batch.add(
    STRUCTURE_GROUP,
    'darkFrame',
    place(span([-0.02, -0.05, reach * 0.25], [0.02, 0, reach * 0.8])),
  );
  const rim = LID_THICKNESS + 0.03;
  const inset = LID_EDGE + 0.02;
  const ribs: [Point, Point][] = [
    [
      [-wide + inset, LID_THICKNESS, inset],
      [wide - inset, rim, inset + 0.05],
    ],
    [
      [-wide + inset, LID_THICKNESS, reach - inset - 0.05],
      [wide - inset, rim, reach - inset],
    ],
    [
      [-wide + inset, LID_THICKNESS, inset],
      [-wide + inset + 0.05, rim, reach - inset],
    ],
    [
      [wide - inset - 0.05, LID_THICKNESS, inset],
      [wide - inset, rim, reach - inset],
    ],
    [
      [-0.025, LID_THICKNESS, inset],
      [0.025, rim, reach - inset],
    ],
    [
      [-wide + inset, LID_THICKNESS, reach / 2 - 0.025],
      [wide - inset, rim, reach / 2 + 0.025],
    ],
  ];
  ribs.forEach(([min, max]) => batch.add(STRUCTURE_GROUP, 'frame', place(span(min, max))));
  [-wide * 0.6, wide * 0.6].forEach((at) => {
    const hinge = rod(
      [x + at - 0.07, FRAME_TOP, hingeZ],
      [x + at + 0.07, FRAME_TOP, hingeZ],
      HINGE_RADIUS,
    );
    batch.add(STRUCTURE_GROUP, 'flange', hinge);
  });
}

function rails(batch: Batch): void {
  const { minX, maxX, halfZ, heights, post } = RAIL;
  const midX = (minX + maxX) / 2;
  const posts: [number, number][] = [
    [minX, halfZ],
    [maxX, halfZ],
    [minX, -halfZ],
    [maxX, -halfZ],
    [midX, halfZ],
    [minX, 0],
    [maxX, 0],
  ];
  const top = heights[0] + post;
  posts.forEach(([px, pz]) => {
    batch.add(STRUCTURE_GROUP, 'safety', rod([px, 0, pz], [px, top, pz], POST_RADIUS, 12));
    batch.add(
      STRUCTURE_GROUP,
      'frame',
      disc([px, FOOT_HEIGHT / 2, pz], AXIS_Y, FOOT_RADIUS, FOOT_HEIGHT),
    );
    batch.boltRing(STRUCTURE_GROUP, [px, FOOT_HEIGHT, pz], AXIS_Y, FOOT_RADIUS * 0.7, 3, BOLT_SIZE);
  });
  const lines: [Point, Point][] = [
    [
      [minX, 0, halfZ],
      [maxX, 0, halfZ],
    ],
    [
      [minX, 0, -halfZ],
      [minX, 0, halfZ],
    ],
    [
      [maxX, 0, -halfZ],
      [maxX, 0, halfZ],
    ],
  ];
  lines.forEach(([from, to]) => {
    heights.forEach((height) => {
      const start: Point = [from[0], height, from[2]];
      const end: Point = [to[0], height, to[2]];
      batch.add(STRUCTURE_GROUP, 'safety', rod(start, end, RAIL_RADIUS, 10));
    });
    const lowStart: Point = [from[0], 0.02, from[2]];
    const lowEnd: Point = [to[0], 0.02 + TOE_BOARD, to[2]];
    batch.add(
      STRUCTURE_GROUP,
      'hatch',
      span(
        [
          Math.min(lowStart[0], lowEnd[0]) - 0.006,
          lowStart[1],
          Math.min(lowStart[2], lowEnd[2]) - 0.006,
        ],
        [
          Math.max(lowStart[0], lowEnd[0]) + 0.006,
          lowEnd[1],
          Math.max(lowStart[2], lowEnd[2]) + 0.006,
        ],
      ),
    );
  });
}

export function buildHatch(batch: Batch): void {
  frame(batch);
  lid(batch);
  rails(batch);
}
