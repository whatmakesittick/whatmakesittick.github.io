import { describe, expect, it } from 'vitest';
import {
  PHASE_IDS,
  PHASE_RANGES,
  STITCH_CYCLE,
  degreesPerSecond,
  phaseAt,
  secondsPerStitch,
} from './cycle';

describe('phaseAt', () => {
  it('names the phase that holds each angle', () => {
    expect(phaseAt(0)).toBe('feed');
    expect(phaseAt(59.9)).toBe('feed');
    expect(phaseAt(60)).toBe('pierce');
    expect(phaseAt(205)).toBe('loop');
    expect(phaseAt(300)).toBe('wrap');
    expect(phaseAt(359.9)).toBe('set');
  });

  it('wraps angles outside one stitch', () => {
    expect(phaseAt(STITCH_CYCLE + 10)).toBe('feed');
    expect(phaseAt(-10)).toBe('set');
  });

  it('covers the whole stitch without gaps', () => {
    PHASE_IDS.slice(1).forEach((id, index) =>
      expect(PHASE_RANGES[id].start).toBe(PHASE_RANGES[PHASE_IDS[index]].end),
    );
    expect(PHASE_RANGES.feed.start).toBe(0);
    expect(PHASE_RANGES.set.end).toBe(STITCH_CYCLE);
  });
});

describe('speed', () => {
  it('turns the handwheel six degrees per second for each stitch a minute', () => {
    expect(degreesPerSecond(20)).toBe(120);
    expect(degreesPerSecond(60)).toBe(STITCH_CYCLE);
  });

  it('takes three seconds per stitch at 20 stitches a minute', () => {
    expect(secondsPerStitch(20)).toBe(3);
  });
});
