import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { PRESETS } from '../state';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO)).toHaveLength(PART_IDS.length);
  });

  it('ranks every part exactly once, the bullet first', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY[0]).toBe('bullet');
  });

  it('labels the parts below the bore on the left and the gas system above on the right', () => {
    (['magazine', 'trigger', 'grip', 'stock', 'cleaningRod', 'hammer'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('left'),
    );
    (
      [
        'gasTube',
        'gasBlock',
        'pistonHead',
        'pistonRod',
        'carrier',
        'chargingHandle',
        'rearSight',
        'frontSight',
      ] as const
    ).forEach((id) => expect(PART_INFO[id].side, id).toBe('right'));
  });

  it('splits the labels of the busy chapters across both sides', () => {
    (['cartridge', 'firing', 'reload'] as const).forEach((id) => {
      const sides = PRESETS[id].labels.map((part) => PART_INFO[part].side);
      expect(sides, id).toContain('left');
      expect(sides, id).toContain('right');
    });
  });
});
