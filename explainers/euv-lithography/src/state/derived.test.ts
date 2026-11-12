import { describe, expect, it } from 'vitest';
import { MACHINE_IDS } from '../ids';
import { flashAt, lightLeftAt, opticsOf, scanAt } from '../model';
import { createAssemblyState, writeAssemblyState } from './derived';
import { DEFAULT_VIEW } from './store';

const PHASE = 750;

function source(machine: (typeof MACHINE_IDS)[number], phase = PHASE) {
  return { phase, playing: false, machine, view: DEFAULT_VIEW };
}

describe('assembly state', () => {
  it('derives the flash, the light and the scan from the phase', () => {
    const state = createAssemblyState(source('nxe3600d'));
    expect(state.flash).toEqual(flashAt(PHASE, 'nxe3600d'));
    expect(state.light.left).toBe(lightLeftAt(PHASE));
    expect(state.scan).toEqual(scanAt(PHASE, 'nxe3600d'));
    expect(state.view).toEqual(DEFAULT_VIEW);
    expect(state).toMatchObject({ phase: PHASE, playing: false });
  });

  it('follows the machine to its optics', () => {
    MACHINE_IDS.forEach((machine) =>
      expect(createAssemblyState(source(machine)).optics).toBe(opticsOf(machine)),
    );
    expect(createAssemblyState(source('exe5000')).optics).not.toBe(
      createAssemblyState(source('nxe3600d')).optics,
    );
  });

  it('rewrites the same object in place', () => {
    const state = createAssemblyState(source('nxe3600d', 0));
    const written = writeAssemblyState(state, source('exe5000', 900));
    expect(written).toBe(state);
    expect(state.phase).toBe(900);
    expect(state.flash).toEqual(flashAt(900, 'exe5000'));
  });
});
