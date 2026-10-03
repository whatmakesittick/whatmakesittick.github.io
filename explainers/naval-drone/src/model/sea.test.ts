import { describe, expect, it } from 'vitest';
import { SEA_STATE_IDS } from '../ids';
import { DEFAULT_SEA_STATE, SEA_STATES, seaAt, waveHeightOf } from './sea';

describe('sea states', () => {
  it('follows WMO code 3700 from smooth to rough', () => {
    expect(SEA_STATE_IDS.map((id) => SEA_STATES[id].wmo)).toEqual([2, 3, 4, 5]);
    expect(SEA_STATES.slight).toEqual({ wmo: 3, from: 0.5, to: 1.25 });
    expect(SEA_STATES.rough).toEqual({ wmo: 5, from: 2.5, to: 4 });
  });

  it('joins the bands without gaps', () => {
    SEA_STATE_IDS.slice(1).forEach((id, index) => {
      expect(SEA_STATES[id].from).toBe(SEA_STATES[SEA_STATE_IDS[index]].to);
    });
  });

  it('draws the middle of each band and starts smooth', () => {
    expect(DEFAULT_SEA_STATE).toBe('smooth');
    expect(waveHeightOf('smooth')).toBeCloseTo(0.3, 9);
    expect(waveHeightOf('slight')).toBeCloseTo(0.875, 9);
    expect(seaAt('moderate')).toEqual({ state: 'moderate', waveHeight: 1.875 });
  });
});
