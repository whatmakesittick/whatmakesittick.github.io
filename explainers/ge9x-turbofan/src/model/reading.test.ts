import { describe, expect, it } from 'vitest';
import { assemblyState } from './reading';
import type { EngineInputs } from './reading';
import { FAN_BLADE_MIN_OPACITY } from './spools';

const INPUTS: EngineInputs = {
  phase: 500,
  playing: true,
  thrust: 0.65,
  cutaway: 'cutaway',
  streams: 'both',
  view: { labels: true, person: true, reverser: false },
  detail: 'near',
};

describe('assemblyState', () => {
  it('carries two shaft speeds, heat, stream speeds and the targets', () => {
    const state = assemblyState(INPUTS);
    expect(state.coreSpeed).toBeGreaterThan(state.fanSpeed);
    expect(state.hotSpeed).toBeGreaterThan(state.coldSpeed);
    expect(state.cutaway).toBe(1);
    expect(state.reverser).toBe(0);
    expect(state.coldDirection).toBe(1);
    expect(state.reading.phase).toBe('burn');
    expect(state.reading.heatAtMarker).toBeGreaterThan(0);
  });

  it('keeps the blades readable at the default lever', () => {
    expect(assemblyState(INPUTS).bladeOpacity).toBeGreaterThan(FAN_BLADE_MIN_OPACITY);
  });

  it('reverses the cold stream with the reverser flag', () => {
    const state = assemblyState({ ...INPUTS, view: { ...INPUTS.view, reverser: true } });
    expect(state.reverser).toBe(1);
    expect(state.coldDirection).toBeLessThan(0);
    expect(state.reading.thrustShare).toBeLessThan(0);
  });
});
