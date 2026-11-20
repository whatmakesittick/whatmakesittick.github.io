import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { AXIS_HEIGHT_M } from '../../model/scale';
import { coreHalfAngle, cutHalfAngle, isCutAway } from './cut';

describe('cutaway sector', () => {
  it('opens toward the camera side and keeps the far side', () => {
    const half = cutHalfAngle(1);
    expect(isCutAway(new Vector3(0, AXIS_HEIGHT_M, 1), half)).toBe(true);
    expect(isCutAway(new Vector3(0, AXIS_HEIGHT_M, -1), half)).toBe(false);
    expect(isCutAway(new Vector3(0, AXIS_HEIGHT_M - 1, 0), half)).toBe(false);
  });

  it('cuts nothing while closed and the core deeper than the shell', () => {
    expect(isCutAway(new Vector3(0, AXIS_HEIGHT_M, 1), cutHalfAngle(0))).toBe(false);
    expect(coreHalfAngle(1)).toBeGreaterThan(cutHalfAngle(1));
    expect(isCutAway(new Vector3(0, AXIS_HEIGHT_M + 1, 0), coreHalfAngle(1))).toBe(true);
  });
});
