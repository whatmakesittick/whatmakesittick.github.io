import { describe, expect, it } from 'vitest';
import { createMriScannerStore } from '../state';
import { MRI_SCANNER_READOUTS } from './readouts';

const HALF_CYCLE = 500;
const HALF_LINES = 32;

function meterOf(id: string) {
  const meter = MRI_SCANNER_READOUTS.find((row) => row.id === id)?.meter;
  if (!meter) throw new Error(`No meter on ${id}`);
  return meter;
}

describe('gauge readouts', () => {
  it('shows the spin frequency, the time in the repetition and the lines of k-space', () => {
    expect(MRI_SCANNER_READOUTS.map((row) => row.id)).toEqual(['larmor', 'time', 'lines']);
    MRI_SCANNER_READOUTS.forEach((row) => expect(row.labelKey).toBe(`readouts.${row.id}`));
    MRI_SCANNER_READOUTS.forEach((row) => expect(row.numeric).toBe(true));
  });

  it('meters the share of the repetition and the share of the lines', () => {
    const state = createMriScannerStore({ phase: HALF_CYCLE, linesFilled: HALF_LINES }).getState();
    expect(meterOf('time').share(state)).toBeCloseTo(0.5);
    expect(meterOf('lines').share(state)).toBeCloseTo(0.5);
    expect(MRI_SCANNER_READOUTS.find((row) => row.id === 'larmor')?.meter).toBeUndefined();
  });
});
