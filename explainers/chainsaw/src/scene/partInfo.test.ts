import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { LABEL_PRIORITY, PART_INFO, UNDIMMED_PARTS } from './partInfo';

const RANKED_COUNT = 25;
const LAST_COUNT = 2;

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO)).toHaveLength(PART_IDS.length);
  });

  it('ranks every part once, the bar, chain and cutters first', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY.slice(0, 3)).toEqual(['bar', 'chain', 'cutters']);
    expect(LABEL_PRIORITY[RANKED_COUNT - 1]).toBe('powerhead');
    const rest = LABEL_PRIORITY.slice(RANKED_COUNT, -LAST_COUNT);
    expect(rest).toEqual(PART_IDS.filter((id) => rest.includes(id)));
  });

  it('gives the caps the lowest rank so they yield to the starter parts', () => {
    expect(LABEL_PRIORITY.slice(-LAST_COUNT)).toEqual(['fuelCap', 'oilCap']);
  });

  it('labels the rear of the saw on the left and the front on the right', () => {
    (['rearHandle', 'carburettor', 'fuelTank', 'clutch', 'log'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('left'),
    );
    (['bar', 'barNose', 'muffler', 'exhaustPort', 'sprocket'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('right'),
    );
  });

  it('never dims the log, the chips, the gas and the oil', () => {
    expect(UNDIMMED_PARTS).toEqual(['log', 'chips', 'freshCharge', 'exhaustGas', 'oilFlow']);
  });
});
