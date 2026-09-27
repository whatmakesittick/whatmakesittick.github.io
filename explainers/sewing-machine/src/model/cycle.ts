import { wrapPhase } from '@core/store';

export const STITCH_CYCLE = 360;

export const PHASE_IDS = ['feed', 'pierce', 'loop', 'wrap', 'set'] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

export interface PhaseRange {
  start: number;
  end: number;
}

export const PHASE_RANGES: Record<PhaseId, PhaseRange> = {
  feed: { start: 0, end: 60 },
  pierce: { start: 60, end: 180 },
  loop: { start: 180, end: 240 },
  wrap: { start: 240, end: 320 },
  set: { start: 320, end: 360 },
};

const SECONDS_PER_MINUTE = 60;

export function phaseAt(angle: number): PhaseId {
  const normalized = wrapPhase(angle, STITCH_CYCLE);
  return (
    PHASE_IDS.find(
      (id) => normalized >= PHASE_RANGES[id].start && normalized < PHASE_RANGES[id].end,
    ) ?? PHASE_IDS[0]
  );
}

export function degreesPerSecond(stitchesPerMinute: number): number {
  return (stitchesPerMinute * STITCH_CYCLE) / SECONDS_PER_MINUTE;
}

export function secondsPerStitch(stitchesPerMinute: number): number {
  return SECONDS_PER_MINUTE / stitchesPerMinute;
}
