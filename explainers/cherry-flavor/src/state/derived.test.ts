import { describe, expect, it } from 'vitest';
import { MOMENTS, RECEPTOR_TYPES, SWEETS_DROPS, unitsAt } from '../model';
import { createAssemblyState, flavorReading, readingAt, writeAssemblyState } from './derived';
import { createFlavorStore } from './store';

function stateAt(phase: number) {
  return { ...createFlavorStore().getState(), phase, playing: false };
}

describe('flavor reading', () => {
  it('follows the bite through the facts sheet temperatures', () => {
    expect(readingAt(stateAt(unitsAt(-1))).temperatureC).toBe(-12);
    expect(readingAt(stateAt(unitsAt(8))).temperatureC).toBeCloseTo(19, 0);
    expect(readingAt(stateAt(MOMENTS.swallow)).inMouth).toBe(false);
  });

  it('smells cherry while chewing and loses it when pinched', () => {
    const open = readingAt(stateAt(MOMENTS.firing));
    expect(open).toMatchObject({ percept: 'flavor', smell: 'cherry', firing: 9 });
    expect(open.receptors).toHaveLength(RECEPTOR_TYPES);
    const shut = readingAt({ ...stateAt(MOMENTS.firing), view: { labels: true, pinched: true } });
    expect(shut).toMatchObject({ percept: 'pinched', noseShare: 0, firing: 0 });
    expect(shut.released).toBeCloseTo(open.released, 6);
  });

  it('names the desk mix by its closest smell', () => {
    const desk = { ...stateAt(MOMENTS.firing), flavor: 'desk' as const, desk: { ...SWEETS_DROPS } };
    expect(readingAt(desk).smell).toBe('sweets');
  });

  it('reuses the reading while the inputs stay the same', () => {
    const state = stateAt(MOMENTS.firing);
    expect(flavorReading(state)).toBe(flavorReading({ ...state, desk: { ...state.desk } }));
  });
});

describe('assembly state', () => {
  it('writes into the same buffers and draws one copy per drop', () => {
    const target = createAssemblyState(stateAt(MOMENTS.inMouth));
    const { reading, copies } = target;
    const later = writeAssemblyState(target, stateAt(MOMENTS.firing));
    expect(later.reading).toBe(reading);
    expect(later.copies).toBe(copies);
    expect(later.copies).toEqual({
      benzaldehyde: 6,
      hexenal: 3,
      linalool: 2,
      eugenol: 1,
      ionone: 1,
    });
    expect(later.reading.seconds).toBe(10);
  });
});
