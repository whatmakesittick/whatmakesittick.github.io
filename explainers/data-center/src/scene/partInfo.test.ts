import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

const LEFT_PARTS = [
  'gridLine',
  'substation',
  'transformers',
  'generators',
  'ups',
  'batteries',
  'chipInset',
  'powerShelves',
  'trayFans',
  'laptop',
  'fibreEntry',
  'manifold',
] as const;

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO).sort()).toEqual([...PART_IDS].sort());
  });

  it('labels the power path, the inset side and the laptop on the left and the rest on the right', () => {
    PART_IDS.forEach((id) =>
      expect(PART_INFO[id].side, id).toBe(
        (LEFT_PARTS as readonly string[]).includes(id) ? 'left' : 'right',
      ),
    );
  });

  it('ranks every part once, the joule and the chip inset first', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY.slice(0, 3)).toEqual(['joule', 'chipInset', 'subjectRack']);
  });
});
