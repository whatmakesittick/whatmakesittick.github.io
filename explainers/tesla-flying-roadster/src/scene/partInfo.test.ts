import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { UNDIMMED_PARTS } from './constants';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

const LEFT_PARTS = ['seat', 'frontNozzles', 'fans', 'runway', 'ramp', 'parkedRow'] as const;

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO)).toHaveLength(PART_IDS.length);
  });

  it('ranks every part once, the jets and the nozzles first', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY.slice(0, 3)).toEqual(['jets', 'cornerNozzles', 'rearNozzles']);
    expect(LABEL_PRIORITY.at(-1)).toBe('runway');
  });

  it('labels the seat side and the site on the left, the tank side on the right', () => {
    PART_IDS.forEach((id) =>
      expect(PART_INFO[id].side, id).toBe(
        (LEFT_PARTS as readonly string[]).includes(id) ? 'left' : 'right',
      ),
    );
    expect(PART_INFO.tank.side).toBe('right');
    expect(PART_INFO.parkedRow.side).toBe('left');
  });

  it('ranks the parked row low, after the car and its nozzles', () => {
    expect(LABEL_PRIORITY.indexOf('parkedRow')).toBeGreaterThan(LABEL_PRIORITY.indexOf('body'));
  });

  it('never dims the runway and the landing pad', () => {
    expect(UNDIMMED_PARTS).toEqual(['runway', 'landingPad']);
  });
});
