import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import en from '../../locales/en.json';
import { PHASE_IDS } from '../ids';
import type { PhaseId, ValveState } from '../ids';
import { createHeartStore } from '../state';
import { HEART_READOUTS } from './readouts';

const VALVES_IN_PHASE: Readonly<Record<PhaseId, ValveState>> = {
  atria: 'avOpen',
  squeeze: 'allClosed',
  eject: 'semilunarOpen',
  relax: 'allClosed',
  fill: 'avOpen',
  rest: 'avOpen',
};

describe('gauge valves', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('names the valves the phase opens when a jump chip lands on its start', () => {
    const store = createHeartStore();
    const valves = HEART_READOUTS.find((row) => row.id === 'valves');
    PHASE_IDS.forEach((phase) => {
      store.getState().jumpToPhase(phase);
      expect(valves?.value(store.getState()), phase).toBe(en.valves.state[VALVES_IN_PHASE[phase]]);
    });
  });
});
