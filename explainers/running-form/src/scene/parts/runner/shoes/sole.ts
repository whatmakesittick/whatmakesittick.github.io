import type { BufferGeometry } from 'three';
import {
  SOLE,
  SOLE_BACK_M,
  SOLE_TIP_M,
  soleBottom,
  soleBottomSpan,
  soleTop,
  soleTopSpan,
} from './design';
import { clusteredStations, gridGeometry, pushQuad } from './grid';
import type { Grid } from './grid';

export const SOLE_MATERIALS = { foam: 0, rubber: 1 } as const;

const STATIONS = 72;
const CORNER_STEPS = 4;
const TOP_CORNER_STEPS = 3;
const WALL_STEPS = 3;
const BOTTOM_RADIUS_M = 0.0055;
const TOP_RADIUS_M = 0.003;
const RADIUS_SHARE = 0.42;
const RUBBER_SEGMENTS = 1 + CORNER_STEPS;
const HALF_TURN = Math.PI / 2;

type RingPoint = readonly [z: number, y: number];

function arc(
  centreZ: number,
  centreY: number,
  radius: number,
  from: number,
  to: number,
  steps: number,
): RingPoint[] {
  return Array.from({ length: steps }, (_, at) => {
    const angle = from + ((to - from) * (at + 1)) / steps;
    return [centreZ + radius * Math.cos(angle), centreY + radius * Math.sin(angle)] as const;
  });
}

function sideRing(x: number, sign: 1 | -1): RingPoint[] {
  const bottom = soleBottom(x);
  const top = soleTop(x);
  const lower = soleBottomSpan(x);
  const upper = soleTopSpan(x);
  const bottomEdge = sign > 0 ? lower.lateral : -lower.medial;
  const topEdge = sign > 0 ? upper.lateral : -upper.medial;
  const width = Math.min(lower.lateral + lower.medial, upper.lateral + upper.medial);
  const height = top - bottom;
  const rb = Math.min(BOTTOM_RADIUS_M, width * RADIUS_SHARE, height * RADIUS_SHARE);
  const rt = Math.min(TOP_RADIUS_M, width * RADIUS_SHARE, height * RADIUS_SHARE * 0.5);
  const turn = sign > 0 ? 1 : -1;
  const bottomCentreZ = bottomEdge - turn * rb;
  const topCentreZ = topEdge - turn * rt;
  const corner = arc(bottomCentreZ, bottom + rb, rb, -HALF_TURN, 0, CORNER_STEPS).map(
    ([z, y]) => [bottomCentreZ + turn * (z - bottomCentreZ), y] as const,
  );
  const wall = Array.from({ length: WALL_STEPS }, (_, at) => {
    const t = (at + 1) / (WALL_STEPS + 1);
    return [bottomEdge + (topEdge - bottomEdge) * t, bottom + rb + (height - rb - rt) * t] as const;
  });
  const topCorner = arc(topCentreZ, top - rt, rt, 0, HALF_TURN, TOP_CORNER_STEPS).map(
    ([z, y]) => [topCentreZ + turn * (z - topCentreZ), y] as const,
  );
  return [[bottomCentreZ, bottom], ...corner, ...wall, [topEdge, top - rt], ...topCorner];
}

function ringAt(x: number): RingPoint[] {
  const lateral = sideRing(x, 1);
  const medial = sideRing(x, -1);
  const bottom = soleBottom(x);
  const top = soleTop(x);
  const lowerCentre = (soleBottomSpan(x).lateral - soleBottomSpan(x).medial) / 2;
  const upperCentre = (soleTopSpan(x).lateral - soleTopSpan(x).medial) / 2;
  return [[lowerCentre, bottom], ...lateral, [upperCentre, top], ...medial.slice().reverse()];
}

function isRubber(x: number, segment: number, ringSize: number): boolean {
  const onPad = x < SOLE.heelPadEndM || x > SOLE.forePadStartM;
  const lateralBottom = segment < RUBBER_SEGMENTS;
  const medialBottom = segment >= ringSize - RUBBER_SEGMENTS;
  return onPad && (lateralBottom || medialBottom);
}

export function soleGeometry(): BufferGeometry {
  const xs = clusteredStations(SOLE_BACK_M, SOLE_TIP_M, STATIONS);
  const rings = xs.map(ringAt);
  const ringSize = rings[0].length;
  const grid: Grid = {
    positions: rings.flatMap((ring, at) => ring.flatMap(([z, y]) => [xs[at], y, z])),
    fields: [],
    stations: xs.length,
    ringSize,
  };
  const foam: number[] = [];
  const rubber: number[] = [];
  for (let station = 0; station < xs.length - 1; station++) {
    const middle = (xs[station] + xs[station + 1]) / 2;
    for (let segment = 0; segment < ringSize; segment++) {
      const target = isRubber(middle, segment, ringSize) ? rubber : foam;
      pushQuad(grid, target, station, segment, false);
    }
  }
  return gridGeometry(grid, [
    { material: SOLE_MATERIALS.foam, indices: foam },
    { material: SOLE_MATERIALS.rubber, indices: rubber },
  ]);
}
