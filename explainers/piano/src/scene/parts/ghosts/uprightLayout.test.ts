import { describe, expect, it } from 'vitest';
import { BLOW_MM, DAMPER_LIFT_MAX_MM, UPRIGHT, mm, uprightPoseAt } from '../../../model';
import { uprightHammerAngle } from '../../pose';
import { turnAbout } from './shapes';
import {
  CROWN_Z,
  DAMPER_HEAD,
  HEAD_Y,
  PIVOT,
  STRAP,
  damperAngle,
  strapEnds,
  uprightAngles,
  wippenAngle,
} from './uprightLayout';

const DIGITS = 9;
const NEAR = 3;
const STRIKE_UNIT = 400;
const HELD_UNIT = 600;
const DAMPER_FRONT = UPRIGHT.stringZ;

describe('upright ghost layout', () => {
  it('rests the hammer 47 mm in front of the string and strikes it exactly', () => {
    expect(CROWN_Z - UPRIGHT.stringZ).toBeCloseTo(mm(BLOW_MM), DIGITS);
    const [, z] = turnAbout([HEAD_Y, CROWN_Z], PIVOT.hammer, uprightHammerAngle(BLOW_MM));
    expect(z).toBeCloseTo(UPRIGHT.stringZ, DIGITS);
  });

  it('poses nothing at rest and swings the hammer toward the strings at the strike', () => {
    const rest = uprightAngles(uprightPoseAt(0, 'medium', 'none', 'middle'));
    Object.values(rest).forEach((angle) => expect(angle).toBeCloseTo(0, DIGITS));
    const strike = uprightAngles(uprightPoseAt(STRIKE_UNIT, 'medium', 'none', 'middle'));
    expect(strike.hammer).toBeLessThan(0);
    expect(strike.key).toBeGreaterThan(0);
    expect(strike.wippen).toBeLessThan(0);
    expect(strike.damper).toBeGreaterThan(0);
  });

  it('escapes the jack once the key is held and moves the rail in with the soft pedal', () => {
    const held = uprightAngles(uprightPoseAt(HELD_UNIT, 'medium', 'none', 'middle'));
    expect(held.jack).toBeGreaterThan(0);
    const soft = uprightAngles(uprightPoseAt(0, 'medium', 'unaCorda', 'middle'));
    expect(soft.rail).toBeLessThan(0);
    expect(soft.rail).toBeCloseTo(soft.hammer, DIGITS);
  });

  it('lifts the damper felt off the string by the damper lift', () => {
    const felt = turnAbout(
      [(DAMPER_HEAD.y[0] + DAMPER_HEAD.y[1]) / 2, DAMPER_FRONT],
      PIVOT.damper,
      damperAngle(DAMPER_LIFT_MAX_MM),
    );
    expect(felt[1] - DAMPER_FRONT).toBeCloseTo(mm(DAMPER_LIFT_MAX_MM), NEAR);
  });

  it('raises the wippen with the key and keeps the bridle strap taut', () => {
    expect(wippenAngle(0)).toBeCloseTo(0, DIGITS);
    expect(wippenAngle(10)).toBeLessThan(0);
    const restLength = Math.hypot(
      STRAP.catcher[0] - STRAP.wire[0],
      STRAP.catcher[1] - STRAP.wire[1],
    );
    const [catcher, wire] = strapEnds(
      uprightAngles(uprightPoseAt(STRIKE_UNIT, 'medium', 'none', 'middle')),
    );
    expect(Math.hypot(catcher[0] - wire[0], catcher[1] - wire[1])).toBeGreaterThan(restLength / 2);
  });
});
