import { describe, expect, it } from 'vitest';
import { CHAIN_ELEMENTS, CHAIN_LOOP_MM, pointOnLoop, wrapChain } from '../../model';
import {
  CONVEYOR_OFFSETS,
  CONVEYOR_SPACING_MM,
  conveyorMm,
  topRunMm,
  windowStartAt,
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

  PARTS.forEach((part) => {
    it(`rides one ${part} part and hands over by one spacing`, () => {
      const start = windowStartAt(part, CENTRE_X);
      const spacing = CONVEYOR_SPACING_MM[part];
      let previous = conveyorMm(part, 0, start);
      let handovers = 0;
      for (let chainMm = STEP_MM; chainMm <= spacing * 2; chainMm += STEP_MM) {
        const current = conveyorMm(part, chainMm, start);
        const moved = wrapChain(current - previous);
        if (moved === STEP_MM || Math.abs(moved - STEP_MM) < 1e-9) {
          expect(wrapChain(current - start)).toBeLessThan(spacing);
        } else {
          handovers += 1;
          expect(moved - CHAIN_LOOP_MM).toBeCloseTo(STEP_MM - spacing, 9);
        }
        expect(
          CONVEYOR_OFFSETS[part].some(
            (offset) => Math.abs(wrapChain(offset + chainMm) - current) < 1e-9,
          ),
        ).toBe(true);
        previous = current;
      }
      expect(handovers).toBeGreaterThan(0);
    });
  });
});
