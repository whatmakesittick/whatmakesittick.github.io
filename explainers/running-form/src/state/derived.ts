import type { ArmsId, AssemblyState, GaitReading, PaceId, ViewOptions } from '../ids';
import { gaitAt } from '../model';

export interface ReadingSource {
  phase: number;
  pace: PaceId;
  stepRate: number;
  arms: ArmsId;
}

export interface AssemblySource extends ReadingSource {
  playing: boolean;
  view: ViewOptions;
}

let lastSource: ReadingSource | null = null;
let lastReading: GaitReading | null = null;

function sameSource(a: ReadingSource, b: ReadingSource): boolean {
  return a.phase === b.phase && a.pace === b.pace && a.stepRate === b.stepRate && a.arms === b.arms;
}

export function gaitReading(source: ReadingSource): GaitReading {
  const { phase, pace, stepRate, arms } = source;
  const key = { phase, pace, stepRate, arms };
  if (lastReading && lastSource && sameSource(lastSource, key)) return lastReading;
  lastSource = key;
  lastReading = gaitAt(phase, { pace, stepRate, arms });
  return lastReading;
}

export function toAssemblyState(source: AssemblySource, target: AssemblyState): AssemblyState {
  target.phase = source.phase;
  target.playing = source.playing;
  target.reading = gaitReading(source);
  target.pace = source.pace;
  target.stepRate = source.stepRate;
  target.arms = source.arms;
  Object.assign(target.view, source.view);
  return target;
}

export function createAssemblyState(source: AssemblySource): AssemblyState {
  return toAssemblyState(source, {
    phase: source.phase,
    playing: source.playing,
    reading: gaitReading(source),
    pace: source.pace,
    stepRate: source.stepRate,
    arms: source.arms,
    scrollM: 0,
    view: { ...source.view },
  });
}
