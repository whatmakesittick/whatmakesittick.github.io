import { describe, expect, it } from 'vitest';
import { FABRIC_TOP } from './fabric';
import { NEEDLE, needleEyeHeight, needleTipHeight } from './needle';

const PRECISION = 6;
const ANGLES = Array.from({ length: 360 }, (_, angle) => angle);

describe('needle bar', () => {
  it('is highest at 0° and lowest at 180°', () => {
    const heights = ANGLES.map(needleTipHeight);
    expect(Math.max(...heights)).toBeCloseTo(needleTipHeight(0), PRECISION);
    expect(Math.min(...heights)).toBeCloseTo(needleTipHeight(180), PRECISION);
  });

  it('lifts the tip clear of the fabric at the top of the stroke', () => {
    expect(needleTipHeight(0)).toBeGreaterThan(FABRIC_TOP);
  });

  it('pushes the tip below the throat plate at the bottom of the stroke', () => {
    expect(needleTipHeight(180)).toBeCloseTo(NEEDLE.lowestTip, PRECISION);
  });

  it('moves the same way down as up', () => {
    expect(needleTipHeight(90)).toBeCloseTo(needleTipHeight(270), PRECISION);
  });

  it('keeps the eye a fixed distance above the tip', () => {
    expect(needleEyeHeight(123) - needleTipHeight(123)).toBeCloseTo(NEEDLE.eyeAboveTip, PRECISION);
  });
});
