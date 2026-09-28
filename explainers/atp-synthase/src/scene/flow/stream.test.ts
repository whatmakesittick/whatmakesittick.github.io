import { describe, expect, it } from 'vitest';
import { streamProgress, streamSlots } from './stream';

describe('stream', () => {
  it('keeps enough slots for every item still travelling', () => {
    expect(streamSlots(100, 250)).toBe(3);
    expect(streamSlots(100, 100)).toBe(1);
  });

  it('gives each slot the progress of one item emitted every period', () => {
    expect(streamProgress(250, 100, 250, 0)).toBeCloseTo(50 / 250);
    expect(streamProgress(250, 100, 250, 1)).toBeCloseTo(150 / 250);
    expect(streamProgress(240, 100, 250, 2)).toBeCloseTo(240 / 250);
    expect(streamProgress(250, 100, 250, 2)).toBeNull();
  });

  it('drops an item once it has arrived', () => {
    expect(streamProgress(250, 100, 120, 1)).toBeNull();
    expect(streamProgress(250, 100, 120, 0)).toBeCloseTo(50 / 120);
  });

  it('runs backwards with the clock, so scrubbing rewinds the stream', () => {
    const later = streamProgress(-30, 100, 250, 0);
    const earlier = streamProgress(-40, 100, 250, 0);
    expect(later).not.toBeNull();
    expect(earlier).not.toBeNull();
    expect(later ?? 0).toBeGreaterThan(earlier ?? 0);
  });
});
