import { describe, expect, it } from 'vitest';
import { PART_SCALE, PRESET_IDS, VIEW_SCALE } from '../ids';
import { PHASE_RANGES, realAt } from '../model';
import { PRESETS, SCALE_DEFAULT_LABELS } from './presets';

describe('presets', () => {
  it('covers every chapter in order', () => {
    expect(Object.keys(PRESETS)).toEqual([...PRESET_IDS]);
  });

  it('opens each chapter at the scale of its camera, with its labels on that scale', () => {
    PRESET_IDS.forEach((id) => {
      const { camera, start, labels, highlight } = PRESETS[id];
      expect(start.scale).toBe(VIEW_SCALE[camera]);
      [...labels, ...highlight].forEach((part) => expect(PART_SCALE[part]).toBe(start.scale));
    });
  });

  it('seeks each chapter to its moment in the default run', () => {
    expect(realAt(PRESETS.slowStep.startAt ?? 0, 10)).toBeCloseTo(3.4, 1);
    expect(realAt(PRESETS.invisibleIodine.startAt ?? 0, 10)).toBeCloseTo(6.2, 1);
    expect(realAt(PRESETS.tippingPoint.startAt ?? 0, 10)).toBeCloseTo(7.6, 1);
    expect(PRESETS.starch.startAt).toBe(PHASE_RANGES.complex.start);
    expect(PRESETS.starch.speed).toBe(1);
  });

  it('keeps the default labels of each scale on that scale', () => {
    Object.entries(SCALE_DEFAULT_LABELS).forEach(([scale, parts]) =>
      parts.forEach((part) => expect(PART_SCALE[part]).toBe(scale)),
    );
  });
});
