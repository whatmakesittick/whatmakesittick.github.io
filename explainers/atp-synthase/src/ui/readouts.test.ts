import { describe, expect, it } from 'vitest';
import { createAtpSynthaseStore } from '../state';
import type { AtpSynthaseStoreState } from '../state';
import { ATP_SYNTHASE_READOUTS } from './readouts';

function readout(id: string) {
  const found = ATP_SYNTHASE_READOUTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No readout ${id}`);
  return found;
}

function stateWith(overrides: Partial<AtpSynthaseStoreState>): AtpSynthaseStoreState {
  return createAtpSynthaseStore(overrides).getState();
}

describe('gauge readouts', () => {
  it('shows the angle, the ATP made, the protons through and the protons per ATP', () => {
    expect(ATP_SYNTHASE_READOUTS.map((row) => row.id)).toEqual([
      'angle',
      'atp',
      'protons',
      'perAtp',
    ]);
    ATP_SYNTHASE_READOUTS.forEach((row) => expect(row.labelKey).toBe(`readouts.${row.id}`));
  });

  it('colours the angle with the ATP being made', () => {
    const { tone } = readout('angle');
    expect(tone?.(stateWith({ phase: 30 }))).toBe('var(--first-atp)');
    expect(tone?.(stateWith({ phase: 135 }))).toBe('var(--second-atp)');
    expect(tone?.(stateWith({ phase: 359 }))).toBe('var(--third-atp)');
  });

  it('counts three ATP and eight protons a lap on the human ring', () => {
    const state = stateWith({ phase: 135, laps: 400 });
    expect(readout('atp').value(state)).toBe('1,201');
    expect(readout('protons').value(state)).toBe('3,203');
    expect(readout('perAtp').value(state)).toBe('2.7');
  });

  it('counts the protons of the picked ring', () => {
    const state = stateWith({ phase: 40, laps: 2, ring: 'chloroplast' });
    expect(readout('protons').value(state)).toBe('29');
    expect(readout('perAtp').value(state)).toBe('4.7');
  });

  it('never counts below zero after scrubbing back past the start', () => {
    const state = stateWith({ phase: 350, laps: -1 });
    expect(readout('atp').value(state)).toBe('0');
    expect(readout('protons').value(state)).toBe('0');
  });
});
