import { describe, expect, it } from 'vitest';
import {
  COMPUTE_TRAYS,
  CPUS,
  FULL_RISE_K,
  GPUS,
  PUE,
  RACK_COUNT,
  RACK_FLOW_KG_S,
  RACK_KW,
  RACKS_PER_ROW,
  ROW_COUNT,
  WATER_CP_KJ,
} from './constants';

const GPUS_PER_TRAY = 4;
const CPUS_PER_TRAY = 2;

describe('constants', () => {
  it('fills the hall with 192 racks in 16 rows of 12', () => {
    expect(RACK_COUNT).toBe(RACKS_PER_ROW * ROW_COUNT);
    expect(RACK_COUNT).toBe(192);
  });

  it('puts four GPUs and two CPUs on each of the 18 compute trays', () => {
    expect(COMPUTE_TRAYS * GPUS_PER_TRAY).toBe(GPUS);
    expect(COMPUTE_TRAYS * CPUS_PER_TRAY).toBe(CPUS);
  });

  it('sets the pump flow so the full 120 kW warms the water by 20 degrees', () => {
    expect(RACK_FLOW_KG_S).toBeCloseTo(1.44, 2);
    expect(RACK_KW.liquid / (RACK_FLOW_KG_S * WATER_CP_KJ)).toBeCloseTo(FULL_RISE_K, 9);
  });

  it('puts the best fleet below the industry average', () => {
    expect(PUE.best).toBeLessThan(PUE.average);
  });
});
