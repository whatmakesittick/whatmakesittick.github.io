import { describe, expect, it } from 'vitest';
import {
  RECORD_OXYGEN_L_PER_MIN,
  REST_OXYGEN_L_PER_MIN,
  atpKgPerHour,
  atpKgPerMinute,
  timesRest,
} from './oxygen';

const HOURS_PER_DAY = 24;
const BODY_MASS_KG = 70;
const REST_ML_PER_KG_PER_MIN = 3.5;
const MILLILITRES_PER_LITRE = 1000;

describe('oxygen and ATP', () => {
  it('takes the resting oxygen use of a 70 kg person at one MET', () => {
    expect(REST_OXYGEN_L_PER_MIN).toBeCloseTo(
      (REST_ML_PER_KG_PER_MIN * BODY_MASS_KG) / MILLILITRES_PER_LITRE,
    );
  });

  it('remakes about 40 kg of ATP in a day lying still', () => {
    expect(atpKgPerHour(REST_OXYGEN_L_PER_MIN) * HOURS_PER_DAY).toBeCloseTo(40, 0);
  });

  it('makes about 0.03 kg of ATP a minute at rest and 0.84 kg at the record', () => {
    expect(atpKgPerMinute(REST_OXYGEN_L_PER_MIN)).toBeCloseTo(0.028, 3);
    expect(atpKgPerMinute(RECORD_OXYGEN_L_PER_MIN)).toBeCloseTo(0.84, 2);
  });

  it('turns a minute into an hour', () => {
    expect(atpKgPerHour(1)).toBeCloseTo(atpKgPerMinute(1) * 60);
  });

  it('compares the oxygen with sitting still', () => {
    expect(timesRest(REST_OXYGEN_L_PER_MIN)).toBe(1);
    expect(timesRest(RECORD_OXYGEN_L_PER_MIN)).toBeCloseTo(30.2, 1);
  });
});
