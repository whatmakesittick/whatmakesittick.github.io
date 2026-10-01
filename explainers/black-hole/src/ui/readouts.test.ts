import { describe, expect, it } from 'vitest';
import { CENTRE_TIME, HORIZON_TIME, tauAtRadius } from '../model';
import { createBlackHoleStore } from '../state';
import type { BlackHoleStoreState } from '../state';
import { BLACK_HOLE_READOUTS } from './readouts';

function readout(id: string) {
  const found = BLACK_HOLE_READOUTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No readout ${id}`);
  return found;
}

function stateAt(phase: number): BlackHoleStoreState {
  return createBlackHoleStore({ phase }).getState();
}

describe('gauge readouts', () => {
  it('shows the two clocks, the ratio, the distance, the speed and the tide', () => {
    expect(BLACK_HOLE_READOUTS.map((row) => row.id)).toEqual([
      'probeClock',
      'shipClock',
      'clockRatio',
      'distance',
      'speed',
      'tide',
    ]);
    BLACK_HOLE_READOUTS.forEach((row) => expect(row.numeric, row.id).toBe(true));
    expect(readout('probeClock').meter).toBeUndefined();
    expect(readout('shipClock').meter).toBeUndefined();
  });

  it('tints the ship clock from the photon sphere in', () => {
    const { tone } = readout('shipClock');
    expect(tone?.(stateAt(tauAtRadius(2)))).toBe('var(--text)');
    expect(tone?.(stateAt(tauAtRadius(1.4)))).toBe('var(--ring)');
    expect(tone?.(stateAt(CENTRE_TIME))).toBe('var(--ring)');
  });

  it('fills the ratio meter over two decades and pins it inside', () => {
    expect(readout('clockRatio').meter?.share(stateAt(0))).toBeCloseTo(Math.log10(1.08) / 2, 2);
    expect(readout('clockRatio').meter?.share(stateAt(tauAtRadius(1.2)))).toBeCloseTo(0.49, 1);
    expect(readout('clockRatio').meter?.share(stateAt(HORIZON_TIME))).toBe(1);
  });

  it('empties the distance meter and fills the speed meter on the way down', () => {
    expect(readout('distance').meter?.share(stateAt(0))).toBe(1);
    expect(readout('distance').meter?.share(stateAt(CENTRE_TIME))).toBeCloseTo(0, 5);
    expect(readout('speed').meter?.share(stateAt(tauAtRadius(2)))).toBeCloseTo(0.61, 2);
    expect(readout('speed').meter?.share(stateAt(HORIZON_TIME))).toBeCloseTo(1, 5);
  });

  it('fills the tide meter from a ten-thousandth of g over six decades', () => {
    expect(readout('tide').meter?.share(stateAt(0))).toBe(0);
    expect(readout('tide').meter?.share(stateAt(HORIZON_TIME))).toBeCloseTo(0.01, 2);
    expect(readout('tide').meter?.share(stateAt(CENTRE_TIME))).toBe(1);
  });
});
