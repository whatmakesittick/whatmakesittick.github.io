import type { Point } from '../../../ids';
import { Bin, rod, slab } from '../optics/geo';

const RIB_PITCH = 0.02;
const RIB_GROW = 0.003;
const RIB_THICK = 0.005;
const CAP_GROW = 0.008;
const CAP_INSET = 0.01;
const BRACKET_LENGTH = 0.07;
const BRACKET_GROW = 0.012;
const BRACKET_ROUND = 0.006;

export interface ChainSpec {
  z: number;
  width: number;
  thick: number;
  topY: number;
  bottomY: number;
  attachX: number;
  bendX: number;
  mountX: number;
  clearance: number;
}

export interface ChainBins {
  moving: Bin;
  fixed: Bin;
  bend: Bin;
}

function box(centre: Point, size: Point, radius = 0) {
  const min = centre.map((value, index) => value - size[index] / 2) as unknown as Point;
  const max = centre.map((value, index) => value + size[index] / 2) as unknown as Point;
  return slab(min, max, radius);
}

function addRun(bin: Bin, spec: ChainSpec, fromX: number, toX: number, y: number): void {
  const length = Math.abs(toX - fromX);
  const ribs = Math.floor(length / RIB_PITCH);
  bin.add('machined', box([(fromX + toX) / 2, y, spec.z], [length, spec.thick, spec.width]));
  Array.from({ length: ribs }, (_, index) =>
    bin.add(
      'frame',
      box(
        [Math.min(fromX, toX) + (index + 0.5) * RIB_PITCH, y, spec.z],
        [RIB_THICK, spec.thick + RIB_GROW, spec.width + RIB_GROW],
      ),
    ),
  );
}

export function cableChain(spec: ChainSpec): ChainBins {
  const radius = (spec.topY - spec.bottomY) / 2 + spec.thick / 2;
  const centreY = (spec.topY + spec.bottomY) / 2;
  const side = Math.sign(spec.z);
  const reach = Math.abs(spec.z) + spec.width / 2 - spec.clearance;
  const moving = new Bin();
  addRun(moving, spec, spec.attachX, spec.bendX, spec.topY);
  moving.add(
    'frame',
    box(
      [spec.attachX - BRACKET_LENGTH / 2, spec.topY, side * (spec.clearance + reach / 2)],
      [BRACKET_LENGTH, spec.thick + BRACKET_GROW, reach],
      BRACKET_ROUND,
    ),
  );
  const fixed = new Bin();
  addRun(fixed, spec, spec.mountX, spec.bendX, spec.bottomY);
  fixed.add(
    'frame',
    box(
      [spec.mountX - BRACKET_LENGTH / 2, spec.bottomY, spec.z],
      [BRACKET_LENGTH, spec.thick + BRACKET_GROW, spec.width + BRACKET_GROW],
      BRACKET_ROUND,
    ),
  );
  const bend = new Bin();
  const half = spec.width / 2;
  const capHalf = half + CAP_GROW;
  bend.add(
    'frame',
    rod(
      [spec.bendX, centreY, spec.z - half],
      [spec.bendX, centreY, spec.z + half],
      radius,
      radius,
      14,
    ),
  );
  bend.add(
    'frame',
    rod(
      [spec.bendX, centreY, spec.z - capHalf],
      [spec.bendX, centreY, spec.z + capHalf],
      radius - CAP_INSET,
      radius - CAP_INSET,
      14,
    ),
  );
  return { moving, fixed, bend };
}
