import { describe, expect, it } from 'vitest';
import { BEAM_M, SECTION_M } from '../../../model';
import { LINE_DRAW } from '../../constants';
import { wrapOffset } from '../../pose';
import { clipped, overlaps, poweredLine, poweredStrip, slotCentre, slotIndices } from './slots';

const SECTION = { sectionStart: 2 * SECTION_M, sectionEnd: 3 * SECTION_M, nextSectionIndex: null };

describe('line slots', () => {
  it('covers the whole drawn line for every wrap offset', () => {
    const slots = slotIndices(BEAM_M, LINE_DRAW.behind, LINE_DRAW.ahead);
    [0, BEAM_M / 2, BEAM_M - 0.01].forEach((distance) => {
      const shift = wrapOffset(distance, BEAM_M);
      const start = shift + slotCentre(slots[0], BEAM_M) - BEAM_M / 2;
      const end = shift + slotCentre(slots[slots.length - 1], BEAM_M) + BEAM_M / 2;
      expect(start).toBeLessThanOrEqual(-LINE_DRAW.behind);
      expect(end).toBeGreaterThanOrEqual(LINE_DRAW.ahead);
    });
  });

  it('puts every slot one period after the last', () => {
    const slots = slotIndices(BEAM_M, LINE_DRAW.behind, LINE_DRAW.ahead);
    slots.slice(1).forEach((slot, index) => {
      expect(slotCentre(slot, BEAM_M) - slotCentre(slots[index], BEAM_M)).toBeCloseTo(BEAM_M);
    });
  });
});

describe('powered strip', () => {
  it('spans the section under the train in scene metres', () => {
    expect(poweredStrip(SECTION, 2 * SECTION_M + 100)).toEqual([-100, SECTION_M - 100]);
  });

  it('reaches into the next section once the nose has crossed into it', () => {
    expect(poweredLine({ ...SECTION, nextSectionIndex: 3 })).toEqual([
      2 * SECTION_M,
      4 * SECTION_M,
    ]);
  });

  it('stops at the end of the line', () => {
    const last = { sectionStart: 24 * SECTION_M, sectionEnd: 25 * SECTION_M };
    expect(poweredLine({ ...last, nextSectionIndex: 25 })).toEqual([
      24 * SECTION_M,
      25 * SECTION_M,
    ]);
  });

  it('clips to the drawn window and drops strips outside it', () => {
    expect(clipped([-2000, 400], [-1300, 1300])).toEqual([-1300, 400]);
    expect(clipped([1400, 2000], [-1300, 1300])).toBeNull();
  });

  it('tells whether a span reaches into the window', () => {
    expect(overlaps(1250, 90, [-600, 1200])).toBe(true);
    expect(overlaps(1300, 90, [-600, 1200])).toBe(false);
  });
});
