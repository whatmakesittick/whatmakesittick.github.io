import { describe, expect, it } from 'vitest';
import { STRING, TOP_DRIVE } from '../../constants';
import { quillHeight, standShare } from './standCycle';

const HIGH = TOP_DRIVE.quillLow + STRING.standLength;
const DRILLED = (1 - TOP_DRIVE.liftShare) * STRING.standLength;

describe('stand cycle', () => {
  it('starts every stand with the top drive at the top of its travel', () => {
    expect(quillHeight(0)).toBeCloseTo(HIGH);
    expect(quillHeight(STRING.standLength * 40)).toBeCloseTo(HIGH);
  });

  it('rides down while the stand is drilled', () => {
    expect(quillHeight(DRILLED / 2)).toBeLessThan(HIGH);
    expect(quillHeight(DRILLED - 1e-6)).toBeCloseTo(TOP_DRIVE.quillLow, 3);
  });

  it('lifts back to the top before the next stand', () => {
    expect(quillHeight(STRING.standLength - 1e-6)).toBeCloseTo(HIGH, 3);
    const midLift = (DRILLED + STRING.standLength) / 2;
    expect(quillHeight(midLift)).toBeGreaterThan(TOP_DRIVE.quillLow);
    expect(quillHeight(midLift)).toBeLessThan(HIGH);
  });

  it('repeats every stand length', () => {
    expect(standShare(STRING.standLength * 3 + 7)).toBeCloseTo(7 / STRING.standLength);
    expect(quillHeight(10)).toBeCloseTo(quillHeight(10 + STRING.standLength * 5));
  });
});
