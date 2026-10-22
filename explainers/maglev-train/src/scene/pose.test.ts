import { describe, expect, it } from 'vitest';
import { Object3D } from 'three';
import {
  BEAM_M,
  FIELD_PERIOD_M,
  LIFT_TRAVEL_MM,
  LINE_M,
  MOMENTS,
  STATIONS,
  TRAIN,
  mm,
  motionAt,
} from '../model';
import { applyTrainPose, chaseTargetFor, lineX, trainLift, wrapOffset } from './pose';

const PRECISION = 12;
const LOOSE_PRECISION = 9;
const SPEC_LIFT_MM = 20;
const TRAIN_AT_M = 500;
const POINT_AHEAD_M = 300;
const NUDGE_MM = 2;
const RESTING = motionAt(0, 'kmh430', 'regen');
const FLOATING = motionAt(MOMENTS.lifted, 'kmh430', 'regen');
const BODY_MIDDLE_Y = (TRAIN.bodyBottom + TRAIN.roof) / 2;
const ALIGNED_MULTIPLES = [1, 3, 7, 100, 1209];
const SAMPLE_DISTANCES = [0.1, 12.4, 24.79, 30.5, 1234.5, 15000.25, LINE_M];

function posed(liftMm: number, lateralMm?: number): Object3D {
  const object = new Object3D();
  object.position.set(5, 5, 5);
  applyTrainPose(object, { liftMm }, lateralMm);
  return object;
}

describe('train lift', () => {
  it('is zero when floating and the lift travel below that when resting', () => {
    expect(trainLift({ liftMm: LIFT_TRAVEL_MM })).toBe(0);
    expect(trainLift({ liftMm: 0 })).toBeCloseTo(-mm(LIFT_TRAVEL_MM), PRECISION);
  });

  it('sets a resting train exactly 20 mm lower than a floating one', () => {
    expect(trainLift(FLOATING) - trainLift(RESTING)).toBeCloseTo(mm(SPEC_LIFT_MM), PRECISION);
  });
});

describe('train pose', () => {
  it('keeps the train middle at the origin and lifts it by the reading', () => {
    const object = posed(0);
    expect(object.position.x).toBe(0);
    expect(object.position.y).toBeCloseTo(-mm(LIFT_TRAVEL_MM), PRECISION);
    expect(object.position.z).toBe(0);
  });

  it('shifts the train sideways by the lateral offset', () => {
    expect(posed(LIFT_TRAVEL_MM, NUDGE_MM).position.toArray()).toEqual([0, 0, mm(NUDGE_MM)]);
  });
});

describe('line position', () => {
  it('draws the airport at the origin when the train reaches it', () => {
    expect(lineX(STATIONS.line.airport, LINE_M)).toBe(0);
  });

  it('draws points behind the train at negative x and ahead at positive x', () => {
    expect(lineX(STATIONS.line.longyangRoad, TRAIN_AT_M)).toBe(-TRAIN_AT_M);
    expect(lineX(TRAIN_AT_M + POINT_AHEAD_M, TRAIN_AT_M)).toBe(POINT_AHEAD_M);
  });
});

describe('wrap offset', () => {
  it('is zero at the start and at exact multiples of the period', () => {
    expect(wrapOffset(0, BEAM_M)).toBe(0);
    ALIGNED_MULTIPLES.forEach((count) => expect(wrapOffset(count * BEAM_M, BEAM_M)).toBe(0));
  });

  it('stays within one period behind the origin', () => {
    SAMPLE_DISTANCES.forEach((distance) => {
      const offset = wrapOffset(distance, FIELD_PERIOD_M);
      expect(offset).toBeLessThanOrEqual(0);
      expect(offset).toBeGreaterThan(-FIELD_PERIOD_M);
    });
  });

  it('keeps recycled parts on the same line positions as the train moves', () => {
    SAMPLE_DISTANCES.forEach((distance) => {
      const beams = (distance + wrapOffset(distance, BEAM_M)) / BEAM_M;
      expect(beams).toBeCloseTo(Math.round(beams), LOOSE_PRECISION);
    });
  });
});

describe('chase target', () => {
  it('follows the body middle with the lift and the lateral offset', () => {
    expect(chaseTargetFor(FLOATING)).toEqual({
      position: [0, BODY_MIDDLE_Y, 0],
      heading: 0,
      pitch: 0,
      roll: 0,
      span: TRAIN.length,
    });
    const [, y, z] = chaseTargetFor(RESTING, NUDGE_MM).position;
    expect(y).toBeCloseTo(BODY_MIDDLE_Y - mm(LIFT_TRAVEL_MM), PRECISION);
    expect(z).toBe(mm(NUDGE_MM));
  });
});
