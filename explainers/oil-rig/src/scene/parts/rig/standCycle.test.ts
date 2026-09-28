import { describe, expect, it } from 'vitest';
import { STAND_LENGTH_M, TOP_DRIVE } from '../../constants';
import { quillHeight, standShare } from './standCycle';

const HIGH = TOP_DRIVE.quillLow + STAND_LENGTH_M;
const DRILLED = (1 - TOP_DRIVE.liftShare) * STAND_LENGTH_M;

describe('stand cycle', () => {
  it('starts every stand with the top drive at the top of its travel', () => {
    expect(quillHeight(0)).toBeCloseTo(HIGH);
    expect(quillHeight(STAND_LENGTH_M * 40)).toBeCloseTo(HIGH);
  });

  it('rides down while the stand is drilled', () => {
    expect(quillHeight(DRILLED / 2)).toBeLessThan(HIGH);
    expect(quillHeight(DRILLED - 1e-6)).toBeCloseTo(TOP_DRIVE.quillLow, 3);
  });

  it('lifts back to the top before the next stand', () => {
    expect(quillHeight(STAND_LENGTH_M - 1e-6)).toBeCloseTo(HIGH, 3);
    const midLift = (DRILLED + STAND_LENGTH_M) / 2;
    expect(quillHeight(midLift)).toBeGreaterThan(TOP_DRIVE.quillLow);
    expect(quillHeight(midLift)).toBeLessThan(HIGH);
  });

  it('repeats every stand length', () => {
    expect(standShare(STAND_LENGTH_M * 3 + 7)).toBeCloseTo(7 / STAND_LENGTH_M);
    expect(quillHeight(10)).toBeCloseTo(quillHeight(10 + STAND_LENGTH_M * 5));
  });
});
