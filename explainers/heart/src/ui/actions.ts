import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { CHAMBER_IDS, VALVE_IDS, WAVE_IDS } from '../ids';
import type { WaveId } from '../ids';
import { FITNESS_IDS, WAVE_MOMENTS } from '../model';
import { timeOf } from '../state';
import type { HeartStoreState } from '../state';

const NOTHING_CURRENT = '';
const WAVE_TOLERANCE_MS = 10;

function waveAt(state: HeartStoreState): WaveId | undefined {
  return WAVE_IDS.find((wave) => Math.abs(WAVE_MOMENTS[wave] - timeOf(state)) <= WAVE_TOLERANCE_MS);
}

function seekWave(state: HeartStoreState, wave: WaveId): void {
  state.pause();
  state.setPhase(WAVE_MOMENTS[wave]);
}

export const CHAPTER_ACTIONS: Record<string, ChapterAction<HeartStoreState>> = {
  chamber: {
    run: (state, value) => state.setChamber(parseOption(value, CHAMBER_IDS)),
    current: (state) => state.chamber,
  },
  valve: {
    run: (state, value) => state.setValve(parseOption(value, VALVE_IDS)),
    current: (state) => state.valve,
  },
  wave: {
    run: (state, value) => seekWave(state, parseOption(value, WAVE_IDS)),
    current: (state) => waveAt(state) ?? NOTHING_CURRENT,
  },
  fitness: {
    run: (state, value) => state.setFitness(parseOption(value, FITNESS_IDS)),
    current: (state) => state.fitness,
  },
};
