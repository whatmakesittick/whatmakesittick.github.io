import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import type { PartId } from '../ids';
import { LABEL_PRIORITY, PART_INFO } from './partInfo';

const LEFT_PARTS: readonly PartId[] = [
  'land',
  'foundation',
  'tower',
  'hub',
  'blades',
  'pitchCylinders',
  'mainBearing',
  'mainShaft',
  'yawDrives',
  'sweptArea',
  'streamlinesGroup',
  'farmLand',
  'prevailingWind',
  'windArrows',
  'shearProfile',
  'spacingMarker',
  'accessRoads',
];
const RANKED_COUNT = 15;
const NACELLE_FIRST: readonly PartId[] = [
  'gearbox',
  'generator',
  'brakeDisc',
  'mainShaft',
  'mainBearing',
  'converter',
];
const NACELLE_LATER: readonly PartId[] = ['pitchCylinders', 'yawDrives', 'cooler'];

describe('part labels', () => {
  it('names every part from its locale key', () => {
    PART_IDS.forEach((id) => expect(PART_INFO[id].labelKey).toBe(`parts.${id}`));
    expect(Object.keys(PART_INFO)).toHaveLength(PART_IDS.length);
  });

  it('ranks every part exactly once, the farm turbines first and the substation second', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY.slice(0, 3)).toEqual(['farmTurbines', 'substation', 'nacelle']);
    expect(LABEL_PRIORITY.indexOf('pitchCylinders')).toBe(RANKED_COUNT - 1);
  });

  it('ranks the drivetrain parts the nacelle chapter names first ahead of the other nacelle labels', () => {
    const ranks = NACELLE_FIRST.map((id) => LABEL_PRIORITY.indexOf(id));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    const lastFirst = Math.max(...ranks);
    NACELLE_LATER.forEach((id) =>
      expect(LABEL_PRIORITY.indexOf(id), id).toBeGreaterThan(lastFirst),
    );
  });

  it('keeps the unranked parts in their part order after the ranked ones', () => {
    const rest = LABEL_PRIORITY.slice(RANKED_COUNT);
    expect(rest).toEqual(PART_IDS.filter((id) => rest.includes(id)));
    expect(rest[0]).toBe('land');
  });

  it('labels the ground, the tower, the rotor and the wind on the left and the rest on the right', () => {
    PART_IDS.forEach((id) =>
      expect(PART_INFO[id].side, id).toBe(LEFT_PARTS.includes(id) ? 'left' : 'right'),
    );
    (['nacelle', 'gearbox', 'generator', 'substation', 'wakePlumes'] as const).forEach((id) =>
      expect(PART_INFO[id].side, id).toBe('right'),
    );
  });
});
