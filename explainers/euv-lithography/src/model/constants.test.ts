import { describe, expect, it } from 'vitest';
import { MACHINE_IDS, OPTICS_IDS } from '../ids';
import {
  BOUNCES,
  FIELDS_PER_WAFER,
  MACHINE_OPTICS,
  MASK_TILT_DEG,
  REFLECTIVITY,
  WAFERS_PER_HOUR,
} from './constants';

describe('constants', () => {
  it('keeps the published numbers', () => {
    expect(REFLECTIVITY).toBe(0.7);
    expect(BOUNCES).toBe(11);
    expect(MASK_TILT_DEG).toEqual({ na033: 6, na055: 5.4 });
    expect(FIELDS_PER_WAFER).toEqual({ na033: 78, na055: 156 });
  });

  it('covers every machine and optics once', () => {
    expect(Object.keys(WAFERS_PER_HOUR)).toEqual([...MACHINE_IDS]);
    expect(Object.keys(MACHINE_OPTICS)).toEqual([...MACHINE_IDS]);
    expect(Object.keys(MASK_TILT_DEG)).toEqual([...OPTICS_IDS]);
  });
});
