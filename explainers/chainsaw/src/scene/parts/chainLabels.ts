import {
  CHAIN_ELEMENTS,
  CHAIN_LOOP_MM,
  CHAIN_PATH,
  DRIVE_LINK_MM,
  pointOnLoop,
  wrapChain,
} from '../../model';
import type { LoopPoint } from '../../model';

export type ConveyorPart = 'driveLinks' | 'cutters' | 'depthGauges';

const MM_PER_METRE = 1000;
const HALF_LINK_MM = DRIVE_LINK_MM / 2;
const SCAN_STEP_MM = 0.25;
const CUTTERS_PER_SIDE_CYCLE = 4;

function seenCutterOffsets(): readonly number[] {
  return CHAIN_ELEMENTS.filter((element) => element.kind === 'cutterRight').map(
    (element) => element.offsetMm + HALF_LINK_MM,
  );
}

export const CONVEYOR_OFFSETS: Readonly<Record<ConveyorPart, readonly number[]>> = {
  driveLinks: CHAIN_ELEMENTS.map((element) => element.offsetMm),
  cutters: seenCutterOffsets(),
  depthGauges: seenCutterOffsets(),
};

export const CONVEYOR_SPACING_MM: Readonly<Record<ConveyorPart, number>> = {
  driveLinks: DRIVE_LINK_MM,
  cutters: DRIVE_LINK_MM * CUTTERS_PER_SIDE_CYCLE,
  depthGauges: DRIVE_LINK_MM * CUTTERS_PER_SIDE_CYCLE,
};

export function topRunMm(x: number): number {
  const [climb, rail] = CHAIN_PATH.segments;
  const end = (climb + rail) * MM_PER_METRE;
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let mm = 0; mm <= end; mm += SCAN_STEP_MM) {
    const distance = Math.abs(pointOnLoop(mm).x - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = mm;
    }
  }
  return best;
}

export function windowStartAt(part: ConveyorPart, centreX: number): number {
  return wrapChain(topRunMm(centreX) - CONVEYOR_SPACING_MM[part] / 2);
}

export function conveyorMm(part: ConveyorPart, chainMm: number, windowStart: number): number {
  let best = 0;
  let bestAhead = CHAIN_LOOP_MM;
  CONVEYOR_OFFSETS[part].forEach((offset) => {
    const position = wrapChain(offset + chainMm);
    const ahead = wrapChain(position - windowStart);
    if (ahead < bestAhead) {
      bestAhead = ahead;
      best = position;
    }
  });
  return best;
}

export function conveyorPoint(part: ConveyorPart, chainMm: number, windowStart: number): LoopPoint {
  return pointOnLoop(conveyorMm(part, chainMm, windowStart));
}
