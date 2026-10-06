import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO)).toHaveLength(PART_IDS.length);
  });

  it('ranks every part exactly once, the net magnet first and the screen second', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY.slice(0, 3)).toEqual(['netMagnet', 'screen', 'headCoil']);
    expect(LABEL_PRIORITY.indexOf('spinArrows')).toBe(13);
  });

  it('keeps the unranked parts in their part order after the ranked ones', () => {
    const rest = LABEL_PRIORITY.slice(14);
    expect(rest).toEqual(PART_IDS.filter((id) => rest.includes(id)));
    expect(rest[0]).toBe('room');
  });

  it('labels the magnet layers, the gradient shells and the patient on the left', () => {
    (
      [
        'cover',
        'vacuumVessel',
        'radiationShield',
        'heliumVessel',
        'mainCoils',
        'shieldCoils',
        'table',
        'patient',
        'gradientX',
        'gradientY',
        'gradientZ',
        'spinArrows',
        'mainField',
        'rfWave',
        'fringeLine',
        'room',
      ] as const
    ).forEach((id) => expect(PART_INFO[id].side, id).toBe('left'));
    (
      ['netMagnet', 'screen', 'headCoil', 'bodyCoil', 'coldHead', 'bore', 'echoWave'] as const
    ).forEach((id) => expect(PART_INFO[id].side, id).toBe('right'));
  });
});
