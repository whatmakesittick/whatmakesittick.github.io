import { describe, expect, it } from 'vitest';
import { MOMENTS } from '../model';
import { createAssemblyState, spoolsNow, thrustNow, writeAssemblyState } from './derived';
import { createEngineStore } from './store';

function stateAt(phase: number) {
  return { ...createEngineStore().getState(), phase, playing: false };
}

describe('assembly state', () => {
  it('builds the frozen assembly state from the store fields', () => {
    const state = createAssemblyState(stateAt(MOMENTS.combustorExit), 'near');
    expect(state).toMatchObject({
      phase: MOMENTS.combustorExit,
      playing: false,
      cutaway: 0,
      reverser: 0,
      streams: 'both',
      detail: 'near',
      thrust: 0.65,
    });
    expect(state.reading.phase).toBe('spin');
  });

  it('writes into the same buffers', () => {
    const target = createAssemblyState(stateAt(0), 'near');
    const { reading } = target;
    const later = writeAssemblyState(target, stateAt(MOMENTS.turbinesExit), 'far');
    expect(later).toBe(target);
    expect(later.reading).toBe(reading);
    expect(later.reading.units).toBe(MOMENTS.turbinesExit);
    expect(later.detail).toBe('far');
  });

  it('reads the spools and the thrust with the reverser deployed', () => {
    const open = { ...stateAt(0), thrust: 1 };
    const reversed = { ...open, view: { ...open.view, reverser: true } };
    expect(spoolsNow(open).fan).toBe(1);
    expect(thrustNow(open)).toBeCloseTo(1, 6);
    expect(spoolsNow(reversed).fan).toBeLessThan(1);
    expect(thrustNow(reversed)).toBeLessThan(0);
  });
});
