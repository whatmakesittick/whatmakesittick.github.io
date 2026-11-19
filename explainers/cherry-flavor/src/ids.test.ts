import { describe, expect, it } from 'vitest';
import {
  ANCHOR_IDS,
  ANCHOR_SCALE,
  CAMERA_VIEW_IDS,
  FLAVOR_IDS,
  ODORANT_IDS,
  PART_IDS,
  PART_SCALE,
  PERCEPT_IDS,
  PHASE_IDS,
  PRESET_IDS,
  REGION_IDS,
  REGION_SCALE,
  SCALE_IDS,
  SMELL_IDS,
  SNIFF_IDS,
  VIEW_IN_SCALE,
  VIEW_SCALE,
} from './ids';

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

describe('ids', () => {
  it('names every part, phase, preset, view, region, anchor and percept once', () => {
    [
      PART_IDS,
      PHASE_IDS,
      PRESET_IDS,
      CAMERA_VIEW_IDS,
      REGION_IDS,
      ANCHOR_IDS,
      PERCEPT_IDS,
      SMELL_IDS,
      SNIFF_IDS,
      FLAVOR_IDS,
    ].forEach((ids) => expect(unique(ids)).toBe(true));
  });

  it('has twenty-six parts: ten in the head, eight on the tongue, eight among the molecules', () => {
    expect(Object.keys(PART_SCALE)).toEqual([...PART_IDS]);
    const count = (scale: string) => PART_IDS.filter((id) => PART_SCALE[id] === scale).length;
    expect(PART_IDS).toHaveLength(26);
    expect([count('head'), count('tongue'), count('molecules')]).toEqual([10, 8, 8]);
  });

  it('labels every odorant as a molecule part', () => {
    ODORANT_IDS.forEach((id) => expect(PART_SCALE[id]).toBe('molecules'));
  });

  it('has six chapters, six phases and six camera views', () => {
    expect(PRESET_IDS).toHaveLength(6);
    expect(PHASE_IDS).toHaveLength(6);
    expect(CAMERA_VIEW_IDS).toHaveLength(6);
  });

  it('maps every view to a view of each scale and keeps a view in its own scale', () => {
    CAMERA_VIEW_IDS.forEach((view) => {
      expect(VIEW_IN_SCALE[view][VIEW_SCALE[view]]).toBe(view);
      SCALE_IDS.forEach((scale) => expect(VIEW_SCALE[VIEW_IN_SCALE[view][scale]]).toBe(scale));
    });
  });

  it('gives every region and anchor a scale', () => {
    expect(Object.keys(REGION_SCALE)).toEqual([...REGION_IDS]);
    expect(Object.keys(ANCHOR_SCALE)).toEqual([...ANCHOR_IDS]);
  });
});
