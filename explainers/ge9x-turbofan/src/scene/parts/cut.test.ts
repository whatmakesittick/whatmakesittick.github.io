import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { AXIS_HEIGHT_M } from '../../model/scale';
import { CUT_CENTRES, coreHalfAngle, cutHalfAngle, isCutAway } from './cut';

describe('cutaway sector', () => {
  it('opens toward the camera side and keeps the far side', () => {
    const half = cutHalfAngle(1);
    expect(isCutAway(new Vector3(0, AXIS_HEIGHT_M, 1), half)).toBe(true);
    expect(isCutAway(new Vector3(0, AXIS_HEIGHT_M, -1), half)).toBe(false);
    expect(isCutAway(new Vector3(0, AXIS_HEIGHT_M - 1, 0), half)).toBe(false);
  });

  it('cuts nothing while closed and opens the core over the top', () => {
    expect(isCutAway(new Vector3(0, AXIS_HEIGHT_M, 1), cutHalfAngle(0))).toBe(false);
    const core = coreHalfAngle(1);
    expect(isCutAway(new Vector3(0, AXIS_HEIGHT_M + 1, 0), core, CUT_CENTRES.core)).toBe(true);
    expect(isCutAway(new Vector3(0, AXIS_HEIGHT_M - 0.7, 0.7), core, CUT_CENTRES.core)).toBe(false);
  });
});
