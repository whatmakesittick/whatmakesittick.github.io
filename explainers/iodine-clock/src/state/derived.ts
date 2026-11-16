import { smoothstep } from '@core/math';
import type { AssemblyState, ClockReading, PhaseId, SpeciesCounts } from '../ids';
import {
  PHASE_RANGES,
  STIR_DEG_PER_S,
  acidAt,
  bisulfiteAt,
  colourDepth,
  complexShare,
  drawnCounts,
  iodateAt,
  iodideAt,
  iodineAt,
  iodineLifetime,
  phaseIdAt,
  phaseProgress,
  realAt,
  sulfateAt,
  switchSeconds,
  toMolar,
  writeIodineEvent,
  writeLandoltEvent,
} from '../model';
import type { ClockState } from './store';

export type RecipeSource = Pick<ClockState, 'iodateMm' | 'temperatureC'>;
export type ReadingSource = RecipeSource & Pick<ClockState, 'phase'>;
export type AssemblySource = ReadingSource & Pick<ClockState, 'scale' | 'playing' | 'view'>;

export function switchSecondsOf(source: RecipeSource): number {
  return switchSeconds(toMolar(source.iodateMm), source.temperatureC);
}

export function emptyCounts(): SpeciesCounts {
  return { iodate: 0, bisulfite: 0, sulfate: 0, iodide: 0, hydrogenIon: 0, iodine: 0 };
}

function pourShare(units: number): number {
  return smoothstep(units, PHASE_RANGES.pour.start, PHASE_RANGES.pour.end);
}

const IODIDE_PER_SULFATE = 1 / 3;
const ACID_PER_SULFATE = 1;

type SulfateSource = Pick<ClockReading, 'sulfateM'>;

export function iodideMadeM(reading: SulfateSource): number {
  return reading.sulfateM * IODIDE_PER_SULFATE;
}

export function acidMadeM(reading: SulfateSource): number {
  return reading.sulfateM * ACID_PER_SULFATE;
}

export function readingAt(source: ReadingSource): ClockReading {
  const switchAt = switchSecondsOf(source);
  const units = source.phase;
  const seconds = realAt(units, switchAt);
  const bisulfiteM = bisulfiteAt(seconds, switchAt);
  const iodineM = iodineAt(seconds, switchAt);
  const reading: ClockReading = {
    seconds,
    switchSeconds: switchAt,
    phase: phaseIdAt(units),
    phaseProgress: phaseProgress(units),
    pour: pourShare(units),
    stirDeg: seconds * STIR_DEG_PER_S,
    temperatureC: source.temperatureC,
    iodateM: iodateAt(seconds, switchAt, toMolar(source.iodateMm)),
    bisulfiteM,
    sulfateM: sulfateAt(seconds, switchAt),
    iodideM: iodideAt(seconds, switchAt),
    acidM: acidAt(seconds, switchAt),
    iodineM,
    lifetimeSeconds: iodineLifetime(bisulfiteM),
    colour: colourDepth(iodineM),
    complex: complexShare(units),
    counts: emptyCounts(),
  };
  drawnCounts(reading, reading.counts);
  return reading;
}

let lastSource: ReadingSource | null = null;
let lastReading: ClockReading | null = null;

function sameSource(a: ReadingSource, b: ReadingSource): boolean {
  return a.phase === b.phase && a.iodateMm === b.iodateMm && a.temperatureC === b.temperatureC;
}

export function clockReading(source: ReadingSource): Readonly<ClockReading> {
  if (lastReading && lastSource && sameSource(lastSource, source)) return lastReading;
  lastSource = {
    phase: source.phase,
    iodateMm: source.iodateMm,
    temperatureC: source.temperatureC,
  };
  lastReading = readingAt(source);
  return lastReading;
}

export function phaseOf(source: Pick<ClockState, 'phase'>): PhaseId {
  return phaseIdAt(source.phase);
}

export function writeAssemblyState(target: AssemblyState, source: AssemblySource): AssemblyState {
  const reading = clockReading(source);
  const counts = Object.assign(target.clock.counts, reading.counts);
  Object.assign(target.clock, reading);
  target.clock.counts = counts;
  target.scale = source.scale;
  target.phase = source.phase;
  target.playing = source.playing;
  writeLandoltEvent(reading.seconds, reading.switchSeconds, target.landolt);
  writeIodineEvent(reading.seconds, reading.switchSeconds, target.iodineEvent);
  target.view.water = source.view.water;
  target.view.labels = source.view.labels;
  return target;
}

export function createAssemblyState(source: AssemblySource): AssemblyState {
  const target: AssemblyState = {
    scale: source.scale,
    phase: source.phase,
    playing: source.playing,
    clock: { ...readingAt(source), counts: emptyCounts() },
    landolt: { active: false, cycle: 0, hop: 0 },
    iodineEvent: { active: false, cycle: 0, stage: 'meet', progress: 0 },
    view: { water: source.view.water, labels: source.view.labels },
  };
  return writeAssemblyState(target, source);
}
