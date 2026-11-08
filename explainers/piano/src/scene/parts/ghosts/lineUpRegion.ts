import type { RegionSpec } from '@core/scene/regions';
import type { CompareId } from '../../../ids';
import { HARPSICHORD, KEY, UPRIGHT, keyX } from '../../../model';
import { JACK } from './harpsichordLayout';
import { HEAD, HEAD_Y, KEY_BOTTOM } from './uprightLayout';

type Extent = readonly [number, number];

interface Span {
  y: Extent;
  z: Extent;
}

const HALF_DEPTH = 0.03;
const FLOOR = KEY_BOTTOM - 0.02;
const FRONT = 0.01;
const SPANS: Readonly<Record<CompareId, Span>> = {
  grand: {
    y: [0.69, 1.32],
    z: [KEY.frontZ - KEY.length - 0.01, HARPSICHORD.offsetZ + FRONT],
  },
  upright: {
    y: [FLOOR, HEAD_Y + HEAD.height / 2 + 0.05],
    z: [UPRIGHT.stringZ - 0.045, UPRIGHT.stringZ + 0.33],
  },
  harpsichord: {
    y: [FLOOR, JACK.top + 0.035],
    z: [JACK.z - 0.045, JACK.z + 0.2],
  },
};

export function lineUpRegionSpec(key: number, compare: CompareId): RegionSpec {
  const x = keyX(key);
  const { y, z } = SPANS[compare];
  return { x: [x - HALF_DEPTH, x + HALF_DEPTH], y, z };
}
