import { describe, expect, it } from 'vitest';
import { createWatchStore } from '../state';
import type { WatchStoreState } from '../state';
import { WATCH_READOUTS } from './readouts';

function readout(id: string) {
  const found = WATCH_READOUTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No readout ${id}`);
  return found;
}

function stateWith(overrides: Partial<WatchStoreState>): WatchStoreState {
  return createWatchStore(overrides).getState();
}

describe('gauge readouts', () => {
  it('shows the balance, amplitude, time, reserve and rate in that order', () => {
    expect(WATCH_READOUTS.map((row) => row.id)).toEqual([
      'balance',
      'amplitude',
      'time',
      'reserve',
      'rate',
    ]);
  });

  it('lights the balance angle while the impulse jewel is in the fork', () => {
    const { tone } = readout('balance');
    expect(tone?.(stateWith({ phase: 90 }))).toBe('var(--tick)');
    expect(tone?.(stateWith({ phase: 270 }))).toBe('var(--tick)');
    expect(tone?.(stateWith({ phase: 30 }))).toBe('var(--text)');
  });

  it('fills the amplitude and reserve meters from the spring', () => {
    expect(readout('amplitude').meter?.share(stateWith({}))).toBeCloseTo(280 / 330);
    expect(readout('reserve').meter?.share(stateWith({ reserve: 21 }))).toBeCloseTo(0.5);
  });

  it('marks a rate outside the chronometer band', () => {
    const { tone } = readout('rate');
    expect(tone?.(stateWith({ regulator: 0 }))).toBe('var(--good)');
    expect(tone?.(stateWith({ regulator: 0.5 }))).toBe('var(--warn)');
  });
});
