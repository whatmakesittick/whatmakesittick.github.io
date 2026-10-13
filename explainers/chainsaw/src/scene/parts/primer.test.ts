import { describe, expect, it } from 'vitest';
import type { StartReading } from '../../ids';
import { PRIMER_PRESSES, READY_POSE, START_STEP_SECONDS, startPose } from '../../model';
import { PrimerFill } from './primer';

const FRAME = 1 / 60;
const PRIMER_FROM =
  START_STEP_SECONDS.brake + START_STEP_SECONDS.choke + START_STEP_SECONDS.decompression;
const PRESS_SECONDS = START_STEP_SECONDS.primer / PRIMER_PRESSES;
const SECOND_PRESS_FROM = PRIMER_FROM + PRESS_SECONDS;

function reading(seconds: number): StartReading {
  return { starting: true, ...startPose(seconds) };
}

describe('primer fill', () => {
  it('stays clear through the first press and fills from the second', () => {
    const fill = new PrimerFill();
    const seen: [number, boolean][] = [];
    for (let seconds = 0; seconds < PRIMER_FROM + START_STEP_SECONDS.primer; seconds += FRAME)
      seen.push([seconds, fill.primed(reading(seconds))]);
    const firstFilled = seen.find(([, primed]) => primed)?.[0] ?? Infinity;
    expect(firstFilled).toBeGreaterThan(SECOND_PRESS_FROM);
    expect(firstFilled).toBeLessThan(SECOND_PRESS_FROM + PRESS_SECONDS);
  });

  it('is full once the pull starts and clear on a cold saw before the start', () => {
    const fill = new PrimerFill();
    expect(fill.primed({ starting: false, ...READY_POSE })).toBe(false);
    expect(fill.primed(reading(PRIMER_FROM + START_STEP_SECONDS.primer + FRAME))).toBe(true);
    expect(fill.primed({ ...READY_POSE, starting: false, engine: 'running' })).toBe(true);
  });
});
