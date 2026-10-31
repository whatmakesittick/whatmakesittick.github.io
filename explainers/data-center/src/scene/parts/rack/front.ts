import type { Extent } from '@core/scene/regions';
import type { BoxSpec } from '../../../model';
import { BEZEL_X, BEZEL_Z, TRAY_X, around } from './dims';
import { box } from './kit';

const HANDLE_M = 0.008;
const HANDLE_REACH_M = 0.01;
const HANDLE_INSET_M = 0.02;
const LED_M = 0.005;
const LED_DEPTH_M = 0.0015;
const FACE_FRONT = BEZEL_Z[0];

export function bezel(tall: number): BoxSpec {
  return box(BEZEL_X, [0, tall], BEZEL_Z);
}

export function proud(depth: number, gap = 0): Extent {
  return [FACE_FRONT - gap - depth, FACE_FRONT - gap];
}

export function handles(tall: number): BoxSpec[] {
  const y: Extent = [tall * 0.2, tall * 0.8];
  return [BEZEL_X[0] + HANDLE_INSET_M, BEZEL_X[1] - HANDLE_INSET_M].map((x) =>
    box(around(x, HANDLE_M), y, proud(HANDLE_REACH_M)),
  );
}

export function led(x: number, y: number, gap = 0): BoxSpec {
  return box(around(x, LED_M), around(y, LED_M), proud(LED_DEPTH_M, gap));
}

export function across(count: number, gap: number, span: Extent = TRAY_X): Extent[] {
  const width = (span[1] - span[0] - gap * (count + 1)) / count;
  return Array.from({ length: count }, (_, index) => {
    const from = span[0] + gap + index * (width + gap);
    return [from, from + width];
  });
}
