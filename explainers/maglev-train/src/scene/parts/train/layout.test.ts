import { describe, expect, it } from 'vitest';
import { ARM_ANCHOR, CUT_X, MAGNETS, SECTION_EXTENTS, SKIDS, TRAIN } from '../../../model';
import { ARM } from './constants';
import {
  LEAD_SECTION,
  TAIL_SECTION,
  TRAIN_LAYOUT,
  eddyModuleIndices,
  sectionModules,
} from './layout';

const DIGITS = 6;

describe('train layout', () => {
  it('fits whole magnet modules into every section, centred', () => {
    SECTION_EXTENTS.forEach((extent) => {
      const modules = sectionModules(extent);
      const front = extent[1] - modules[modules.length - 1][1];
      expect(modules[0][0] - extent[0]).toBeCloseTo(front, DIGITS);
      modules.forEach(([from, to]) => expect(to - from).toBeCloseTo(MAGNETS.moduleLength, DIGITS));
    });
  });

  it('puts a module boundary on the cut so nothing straddles it', () => {
    const boundaries = TRAIN_LAYOUT[LEAD_SECTION].modules.map(([from]) => from);
    expect(boundaries.some((x) => Math.abs(x - CUT_X) < 1e-9)).toBe(true);
    TRAIN_LAYOUT[LEAD_SECTION].arms.forEach((x) =>
      expect(Math.abs(x - CUT_X)).toBeGreaterThan(ARM.length / 2),
    );
    TRAIN_LAYOUT[LEAD_SECTION].skids.forEach((x) =>
      expect(Math.abs(x - CUT_X)).toBeGreaterThan(SKIDS.length / 2),
    );
  });

  it('spreads the eddy brake modules over each side', () => {
    expect(eddyModuleIndices(8)).toEqual([4]);
  });

  it('mirrors the tail section from the lead', () => {
    const lead = TRAIN_LAYOUT[LEAD_SECTION];
    const tail = TRAIN_LAYOUT[TAIL_SECTION];
    expect(tail.extent).toEqual([TRAIN.tailX, -lead.extent[0]]);
    expect(tail.arms[0]).toBeCloseTo(-lead.arms[lead.arms.length - 1], DIGITS);
    expect(tail.windows.length).toBe(lead.windows.length);
  });

  it('keeps windows clear of doors and of the nose', () => {
    TRAIN_LAYOUT.forEach((section) => {
      section.doors.forEach((door) => expect(section.windows).not.toContain(door));
    });
    const lead = TRAIN_LAYOUT[LEAD_SECTION];
    expect(Math.max(...lead.windows)).toBeLessThan(TRAIN.noseX - 6);
  });

  it('places a skid near the arm anchor for the arm view', () => {
    const nearest = Math.min(
      ...TRAIN_LAYOUT[LEAD_SECTION].skids.map((x) => Math.abs(x - ARM_ANCHOR[0])),
    );
    expect(nearest).toBeLessThan(MAGNETS.moduleLength / 2);
  });
});
