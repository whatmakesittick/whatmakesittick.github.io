import { describe, expect, it } from 'vitest';
import {
  AXIS_CHOICE_IDS,
  FOLLOW_SEQUENCE,
  GRADIENT_AXIS_IDS,
  MOMENT_IDS,
  PART_IDS,
  PHASE_IDS,
  PRESET_IDS,
} from './ids';

describe('ids', () => {
  it('names every part once', () => {
    expect(PART_IDS).toHaveLength(27);
    expect(new Set(PART_IDS).size).toBe(PART_IDS.length);
  });

  it('orders the steps of one repetition and the chapters', () => {
    expect(PHASE_IDS).toEqual(['excite', 'encode', 'refocus', 'echo', 'recover']);
    expect(MOMENT_IDS).toEqual(['pulse90', 'pulse180', 'echoPeak', 'repetitionEnd']);
    expect(PRESET_IDS).toEqual([
      'overview',
      'magnet',
      'spins',
      'resonance',
      'gradients',
      'picture',
    ]);
  });

  it('offers the three axes plus following the sequence', () => {
    expect(AXIS_CHOICE_IDS).toEqual([...GRADIENT_AXIS_IDS, FOLLOW_SEQUENCE]);
  });
});
