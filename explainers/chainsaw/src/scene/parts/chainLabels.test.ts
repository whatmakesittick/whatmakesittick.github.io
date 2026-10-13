import { describe, expect, it } from 'vitest';
import { CHAIN_ELEMENTS, CHAIN_LOOP_MM, pointOnLoop, wrapChain } from '../../model';
import {
  CONVEYOR_OFFSETS,
  CONVEYOR_SPACING_MM,
  rideAlong,
  ridingMm,
  topRunMm,
} from './chainLabels';
import type { ConveyorPart } from './chainLabels';

const PARTS: readonly ConveyorPart[] = ['driveLinks', 'cutters', 'depthGauges'];
const CENTRE_X = 0.3;
const STEP_MM = 0.5;

describe('chain label conveyor', () => {
  it('finds the top-run distance of a point on the bar', () => {
    expect(pointOnLoop(topRunMm(CENTRE_X)).x).toBeCloseTo(CENTRE_X, 3);
  });

  it('follows only the cutters on the +z side', () => {
    const seen = CHAIN_ELEMENTS.filter((element) => element.kind === 'cutterRight').length;
    expect(CONVEYOR_OFFSETS.cutters).toHaveLength(seen);
  });

  PARTS.forEach((part, index) => {
    it(`rides one ${part} part along the whole top run, then boards the next at the heel`, () => {
      const ride = rideAlong(0.07, 0.4, index / PARTS.length);
      const spacing = CONVEYOR_SPACING_MM[part];
      let previous = ridingMm(part, 0, ride);
      let restarts = 0;
      for (let chainMm = STEP_MM; chainMm <= ride.length * 2; chainMm += STEP_MM) {
        const current = ridingMm(part, chainMm, ride);
        const moved = wrapChain(current - previous);
        if (Math.abs(moved - STEP_MM) > 1e-6) {
          restarts += 1;
          expect(CHAIN_LOOP_MM - moved).toBeGreaterThan(ride.length - spacing * 2);
        }
        expect(wrapChain(current - ride.start)).toBeLessThan(ride.length + spacing * 2);
        expect(
          CONVEYOR_OFFSETS[part].some(
            (offset) => Math.abs(wrapChain(offset + chainMm) - current) < 1e-6,
          ),
        ).toBe(true);
        previous = current;
      }
      expect(restarts).toBeGreaterThanOrEqual(1);
      expect(restarts).toBeLessThanOrEqual(2);
    });
  });
});
