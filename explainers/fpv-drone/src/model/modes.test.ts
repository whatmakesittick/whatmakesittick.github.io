import { describe, expect, it } from 'vitest';
import { FLIGHT_MODE_IDS } from '../ids';
import { DEFAULT_MAX_RATE_DEG_S, FLIGHT_MODES } from './modes';

describe('flight modes', () => {
  it('names the stick and the limit text of acro, angle and horizon', () => {
    expect(Object.keys(FLIGHT_MODES)).toEqual([...FLIGHT_MODE_IDS]);
    FLIGHT_MODE_IDS.forEach((id) => {
      expect(FLIGHT_MODES[id].stickKey).toBe(`mode.stick.${id}`);
      expect(FLIGHT_MODES[id].limitKey).toBe(`mode.limit.${id}`);
    });
  });

  it('quotes the default maximum rate', () => {
    expect(DEFAULT_MAX_RATE_DEG_S).toBe(670);
  });
});
