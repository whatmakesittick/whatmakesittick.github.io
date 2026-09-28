import type { Readout } from '@core/explainer';
import { phaseAt, protonsPerAtp } from '../model';
import { atpMadeOf, bladeCountOf, protonsThroughOf } from '../state';
import type { AtpSynthaseStoreState } from '../state';
import { formatCount, formatPerAtp, formatPhase } from './format';
import { PHASE_TONES } from './palette';

export const ATP_SYNTHASE_READOUTS: readonly Readout<AtpSynthaseStoreState>[] = [
  {
    id: 'angle',
    labelKey: 'readouts.angle',
    numeric: true,
    value: (state) => formatPhase(state.phase),
    tone: (state) => PHASE_TONES[phaseAt(state.phase)],
  },
  {
    id: 'atp',
    labelKey: 'readouts.atp',
    numeric: true,
    value: (state) => formatCount(atpMadeOf(state)),
  },
  {
    id: 'protons',
    labelKey: 'readouts.protons',
    numeric: true,
    value: (state) => formatCount(protonsThroughOf(state)),
  },
  {
    id: 'perAtp',
    labelKey: 'readouts.perAtp',
    numeric: true,
    value: (state) => formatPerAtp(protonsPerAtp(bladeCountOf(state))),
  },
];
