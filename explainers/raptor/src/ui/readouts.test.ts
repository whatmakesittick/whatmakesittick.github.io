import { describe, expect, it } from 'vitest';
import { createRaptorStore } from '../state';
import type { RaptorStoreState } from '../state';
import { RAPTOR_READOUTS } from './readouts';

function readout(id: string) {
  const found = RAPTOR_READOUTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No readout ${id}`);
  return found;
}

function stateAt(phase: number): RaptorStoreState {
  return createRaptorStore({ phase }).getState();
}

describe('gauge readouts', () => {
  it('shows thrust, efficiency, air, height and throttle in that order', () => {
    expect(RAPTOR_READOUTS.map((row) => row.id)).toEqual([
      'thrust',
      'efficiency',
      'airPressure',
      'altitude',
      'throttle',
    ]);
    RAPTOR_READOUTS.forEach((row) => expect(row.numeric, row.id).toBe(true));
  });

  it('tints the thrust while the engine runs', () => {
    const { tone } = readout('thrust');
    expect(tone?.(stateAt(20))).toBe('var(--flame)');
    expect(tone?.(stateAt(0))).toBe('var(--text)');
  });

  it('fills the thrust against 280 t and the efficiency between 300 and 360 s', () => {
    expect(readout('thrust').meter?.share(stateAt(3))).toBeCloseTo(250 / 280, 2);
    expect(readout('efficiency').meter?.share(stateAt(3))).toBeCloseTo(0.5, 1);
    expect(readout('efficiency').meter?.share(stateAt(0))).toBe(0);
    expect(readout('efficiency').meter?.share(stateAt(120))).toBeLessThanOrEqual(1);
  });

  it('empties the air meter and fills the height meter on the way up', () => {
    expect(readout('airPressure').meter?.share(stateAt(3))).toBeCloseTo(1);
    expect(readout('airPressure').meter?.share(stateAt(120))).toBeLessThan(0.05);
    expect(readout('altitude').meter?.share(stateAt(143))).toBeCloseTo(1);
    expect(readout('throttle').meter?.share(stateAt(55))).toBeCloseTo(0.8);
  });
});
