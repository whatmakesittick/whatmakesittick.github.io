import type { SeaReading, SeaStateId } from '../ids';

export interface SeaState {
  wmo: number;
  from: number;
  to: number;
}

export const SEA_STATES: Readonly<Record<SeaStateId, SeaState>> = {
  smooth: { wmo: 2, from: 0.1, to: 0.5 },
  slight: { wmo: 3, from: 0.5, to: 1.25 },
  moderate: { wmo: 4, from: 1.25, to: 2.5 },
  rough: { wmo: 5, from: 2.5, to: 4 },
};

export const DEFAULT_SEA_STATE: SeaStateId = 'smooth';

export function waveHeightOf(state: SeaStateId): number {
  const { from, to } = SEA_STATES[state];
  return (from + to) / 2;
}

export function seaAt(state: SeaStateId): SeaReading {
  return { state, waveHeight: waveHeightOf(state) };
}
