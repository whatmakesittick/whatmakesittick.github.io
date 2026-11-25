import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

describe('part info', () => {
  it('ranks every part once', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
  });

  it('labels every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
  });

  it('puts the left side parts on the left and the right side parts on the right', () => {
    (['shoulder', 'arm', 'elbow', 'pelvis', 'hip', 'heel', 'road'] as const).forEach((id) =>
      expect(PART_INFO[id].side).toBe('left'),
    );
    (['head', 'trunk', 'thigh', 'knee', 'shin', 'achilles', 'arch', 'shoe'] as const).forEach(
      (id) => expect(PART_INFO[id].side).toBe('right'),
    );
  });
});
