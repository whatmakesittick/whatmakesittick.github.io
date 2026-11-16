import { describe, expect, it } from 'vitest';
import {
  ANCHOR_IDS,
  ANCHOR_SCALE,
  CAMERA_VIEW_IDS,
  PART_IDS,
  PART_SCALE,
  PHASE_IDS,
  PRESET_IDS,
  REGION_IDS,
  REGION_SCALE,
  SCALE_PARTNER,
  VIEW_SCALE,
} from './ids';

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

describe('ids', () => {
  it('names every part, phase, preset, view, region and anchor once', () => {
    [PART_IDS, PHASE_IDS, PRESET_IDS, CAMERA_VIEW_IDS, REGION_IDS, ANCHOR_IDS].forEach((ids) =>
      expect(unique(ids)).toBe(true),
    );
  });

  it('has twenty parts, nine in the beaker and eleven among the molecules', () => {
    expect(Object.keys(PART_SCALE)).toEqual([...PART_IDS]);
    const beaker = PART_IDS.filter((id) => PART_SCALE[id] === 'beaker');
    expect(PART_IDS).toHaveLength(20);
    expect(beaker).toHaveLength(9);
  });

  it('has six chapters and six camera views', () => {
    expect(PRESET_IDS).toHaveLength(6);
    expect(CAMERA_VIEW_IDS).toHaveLength(6);
  });

  it('partners every view with one at the other scale', () => {
    CAMERA_VIEW_IDS.forEach((view) => {
      const partner = SCALE_PARTNER[view];
      expect(VIEW_SCALE[partner]).not.toBe(VIEW_SCALE[view]);
    });
  });

  it('gives every region and anchor a scale', () => {
    expect(Object.keys(REGION_SCALE)).toEqual([...REGION_IDS]);
    expect(Object.keys(ANCHOR_SCALE)).toEqual([...ANCHOR_IDS]);
  });
});
