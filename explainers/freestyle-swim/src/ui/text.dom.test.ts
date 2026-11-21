import { beforeAll, describe, expect, it } from 'vitest';
import { strokeAt } from '../model';
import { depthText, downbeatLeg, elbowText, rollSide, sideText } from './text';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { chapters, units } = TEST_LOCALE;
const OPTIONS = { pace: 'middle', kick: 'six', breathing: 'none', headUp: false } as const;
const AT_ENTRY = 0;
const AT_RECOVERY = 877;
const AT_CATCH = 300;
const RIGHT_LOW_UNITS = 250;
const LEFT_LOW_UNITS = 750;
const ROLL_ZERO_UNITS = 500;

describe('readout texts', () => {
  beforeAll(() => initTestLocale());

  it('says when there is no elbow value or the hand is in the air', () => {
    const air = strokeAt(AT_RECOVERY, OPTIONS).right;
    expect(elbowText(air)).toBe(chapters.catch.noElbow);
    expect(depthText(air)).toBe(chapters.catch.inAir);
    const catchArm = strokeAt(AT_CATCH, OPTIONS).right;
    expect(elbowText(catchArm)).toBe(fill(units.degrees, { value: '148' }));
  });

  it('reads the same side scrubbing backwards and forwards through zero', () => {
    const sideAt = (units: number) => sideText(strokeAt(units, OPTIONS));
    const forwards = [ROLL_ZERO_UNITS - 10, ROLL_ZERO_UNITS, ROLL_ZERO_UNITS + 10].map(sideAt);
    const backwards = [ROLL_ZERO_UNITS + 10, ROLL_ZERO_UNITS, ROLL_ZERO_UNITS - 10].map(sideAt);
    expect(forwards).toEqual(backwards.reverse());
    expect(sideAt(ROLL_ZERO_UNITS)).toBe(chapters.roll.sideLeft);
    expect(sideAt(0)).toBe(chapters.roll.sideRight);
    expect(rollSide(strokeAt(RIGHT_LOW_UNITS, OPTIONS))).toBe('right');
    expect(rollSide(strokeAt(LEFT_LOW_UNITS, OPTIONS))).toBe('left');
  });

  it('names the leg in the first half of its beat', () => {
    expect(downbeatLeg(strokeAt(AT_ENTRY, OPTIONS))).toBe('left');
    const other = [...Array(1000).keys()].find(
      (u) => downbeatLeg(strokeAt(u, OPTIONS)) === 'right',
    );
    expect(other).toBeDefined();
  });
});
