import { describe, expect, it } from 'vitest';
import {
  ANCHOR_IDS,
  CAMERA_VIEW_IDS,
  CAR_ANCHOR_IDS,
  CAR_REGION_IDS,
  LABEL_PRIORITY,
  NOZZLE_IDS,
  NOZZLE_PARTS,
  PART_IDS,
  PHASE_IDS,
  PRESET_IDS,
  REGION_IDS,
} from './ids';

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

describe('ids', () => {
  it('names every part, phase, preset, nozzle and view once', () => {
    [PART_IDS, PHASE_IDS, PRESET_IDS, CAMERA_VIEW_IDS, NOZZLE_IDS].forEach((ids) =>
      expect(unique(ids)).toBe(true),
    );
  });

  it('ranks every part for labels exactly once', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
  });

  it('gives each chapter its own camera view', () => {
    expect(PRESET_IDS).toHaveLength(CAMERA_VIEW_IDS.length);
  });

  it('has ten nozzles in three part groups', () => {
    expect(NOZZLE_IDS).toHaveLength(10);
    expect(Object.keys(NOZZLE_PARTS)).toEqual([...NOZZLE_IDS]);
    const groups = Object.values(NOZZLE_PARTS);
    expect(groups.filter((group) => group === 'cornerNozzles')).toHaveLength(4);
    expect(groups.filter((group) => group === 'frontNozzles')).toHaveLength(2);
    expect(groups.filter((group) => group === 'rearNozzles')).toHaveLength(4);
  });

  it('splits regions and anchors into the ones on the car and the ones on the site', () => {
    CAR_REGION_IDS.forEach((id) => expect(REGION_IDS).toContain(id));
    CAR_ANCHOR_IDS.forEach((id) => expect(ANCHOR_IDS).toContain(id));
  });
});
