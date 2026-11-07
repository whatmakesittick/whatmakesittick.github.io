import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

const LEFT_PARTS = [
  'hammer',
  'backCheck',
  'damper',
  'strings',
  'stringSet',
  'bassStrings',
  'bridge',
  'soundboard',
  'plate',
] as const;

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO).sort()).toEqual([...PART_IDS].sort());
  });

  it('labels the tail side on the left and the rest on the right', () => {
    PART_IDS.forEach((id) =>
      expect(PART_INFO[id].side, id).toBe(
        (LEFT_PARTS as readonly string[]).includes(id) ? 'left' : 'right',
      ),
    );
  });

  it('ranks every part once, the inset and the hammer first', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY.slice(0, 3)).toEqual(['inset', 'hammer', 'jack']);
  });
});
