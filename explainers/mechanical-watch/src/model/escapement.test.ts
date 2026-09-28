import { describe, expect, it } from 'vitest';
import {
  ADVANCE_PER_BEAT_DEG,
  BEAT_STAGES,
  DROP_DEG,
  IMPULSE_DEG,
  LIFT_ANGLE_DEG,
  MOMENT_PROGRESS,
  PALLET_SPAN_DEG,
  TOOTH_PITCH_DEG,
  beatStage,
  escapeAdvanceInBeat,
} from './escapement';

describe('escapement constants', () => {
  it('advances half a tooth of a twenty-tooth wheel per beat', () => {
    expect(TOOTH_PITCH_DEG).toBe(18);
    expect(ADVANCE_PER_BEAT_DEG).toBe(9);
    expect(IMPULSE_DEG + DROP_DEG).toBe(ADVANCE_PER_BEAT_DEG);
    expect(PALLET_SPAN_DEG).toBe(45);
    expect(LIFT_ANGLE_DEG).toBe(50);
  });

  it('orders the moments through a beat', () => {
    expect(MOMENT_PROGRESS.lock).toBeLessThan(0);
    expect(MOMENT_PROGRESS.unlock).toBeLessThan(BEAT_STAGES.unlockEnd);
    expect(MOMENT_PROGRESS.impulse).toBeGreaterThan(BEAT_STAGES.unlockEnd);
    expect(MOMENT_PROGRESS.impulse).toBeLessThan(BEAT_STAGES.impulseEnd);
    expect(MOMENT_PROGRESS.drop).toBeGreaterThan(BEAT_STAGES.impulseEnd);
    expect(MOMENT_PROGRESS.drop).toBeLessThan(BEAT_STAGES.dropEnd);
    expect(MOMENT_PROGRESS.free).toBeGreaterThan(1);
  });
});

describe('escapeAdvanceInBeat', () => {
  it('keeps the wheel still while unlocking and after locking', () => {
    expect(escapeAdvanceInBeat(0)).toBe(0);
    expect(escapeAdvanceInBeat(BEAT_STAGES.unlockEnd)).toBe(0);
    expect(escapeAdvanceInBeat(BEAT_STAGES.dropEnd)).toBeCloseTo(ADVANCE_PER_BEAT_DEG);
    expect(escapeAdvanceInBeat(1)).toBe(ADVANCE_PER_BEAT_DEG);
  });

  it('gives the impulse before the drop', () => {
    const midImpulse = (BEAT_STAGES.unlockEnd + BEAT_STAGES.impulseEnd) / 2;
    expect(escapeAdvanceInBeat(midImpulse)).toBeCloseTo(IMPULSE_DEG / 2);
    expect(escapeAdvanceInBeat(BEAT_STAGES.impulseEnd)).toBeCloseTo(IMPULSE_DEG);
  });

  it('never runs backwards', () => {
    let previous = 0;
    for (let progress = 0; progress <= 1; progress += 0.01) {
      const advance = escapeAdvanceInBeat(progress);
      expect(advance).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = advance;
    }
  });
});

describe('beatStage', () => {
  it('names each stage of the beat', () => {
    expect(beatStage(0)).toBe('locked');
    expect(beatStage(0.1)).toBe('unlocking');
    expect(beatStage(0.5)).toBe('impulse');
    expect(beatStage(0.9)).toBe('drop');
    expect(beatStage(0.97)).toBe('running');
    expect(beatStage(1)).toBe('locked');
  });
});
