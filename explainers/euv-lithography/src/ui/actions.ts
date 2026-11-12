import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { MOMENT_IDS } from '../ids';
import type { ChapterActionId, MomentId } from '../ids';
import { BOUNCES, MOMENTS, bounceCountAt, unitsAfterBounce } from '../model';
import type { EuvStoreState } from '../state';
import { applyMachineChoice } from './dock';

const NOTHING_CURRENT = '';
const NO_BOUNCES = 0;

function seekMoment(state: EuvStoreState, moment: MomentId): void {
  state.pause();
  state.setPhase(MOMENTS[moment]);
}

function currentMoment(state: EuvStoreState): string {
  return MOMENT_IDS.find((moment) => MOMENTS[moment] === state.phase) ?? NOTHING_CURRENT;
}

function parseBounce(value: string): number {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0 || count > BOUNCES) {
    throw new Error(`Unknown bounce count: ${value}`);
  }
  return count;
}

export function seekBounceCount(state: EuvStoreState, count: number): void {
  state.pause();
  state.setPhase(unitsAfterBounce(count));
}

function seekBounce(state: EuvStoreState, value: string): void {
  seekBounceCount(state, parseBounce(value));
}

export function bounceCountOf(phase: number): number {
  return phase < MOMENTS.atFocus ? NO_BOUNCES : bounceCountAt(phase);
}

function currentBounce(state: EuvStoreState): string {
  return String(bounceCountOf(state.phase));
}

export const CHAPTER_ACTIONS: Record<ChapterActionId, ChapterAction<EuvStoreState>> = {
  moment: {
    run: (state, value) => seekMoment(state, parseOption(value, MOMENT_IDS)),
    current: currentMoment,
  },
  bounce: { run: seekBounce, current: currentBounce },
  machine: { run: applyMachineChoice, current: (state) => state.machine },
};
