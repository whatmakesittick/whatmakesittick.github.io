import { FULL_TURN, wrapAngle } from '@core/math';
import { FIELD_IDS, WEIGHTING_IDS } from '../ids';
import type {
  AssemblyState,
  FieldId,
  GradientAxisId,
  Point,
  SequenceReading,
  SpinReading,
  WeightingId,
} from '../ids';
import {
  CYCLE_UNITS,
  DISPLAY_TURNS_PER_S,
  FIELDS,
  SECONDS_PER_MINUTE,
  WEIGHTINGS,
  activeGradient,
  echoAmplitude,
  gradientLevel,
  larmorHz,
  magnetisation,
  phaseOf,
  pictureFor,
  realMs,
  rfPulse,
  spinArrows,
} from '../model';
import { DEFAULT_SPEED } from '../timeline';
import { LINES_RANGE } from './store';
import type { MriScannerState } from './store';

export type AssemblySource = Pick<
  MriScannerState,
  | 'phase'
  | 'playing'
  | 'field'
  | 'weighting'
  | 'tipAngle'
  | 'tissue'
  | 'gradientAxis'
  | 'linesFilled'
  | 'view'
>;

type SpinSource = Pick<AssemblySource, 'phase' | 'weighting' | 'tissue' | 'field' | 'tipAngle'>;

export interface TimeGauge {
  ms: number;
  totalMs: number;
  share: number;
}

export const PRECESSION_TURNS_PER_CYCLE =
  (DISPLAY_TURNS_PER_S * SECONDS_PER_MINUTE) / DEFAULT_SPEED;
export const CHOSEN_AXIS_LEVEL = 1;

export function drawnTurnsPerSecond(speed: number): number {
  return (PRECESSION_TURNS_PER_CYCLE * speed) / SECONDS_PER_MINUTE;
}

export function drawnSlowdown(field: FieldId, speed: number): number {
  return larmorHz(field) / drawnTurnsPerSecond(speed);
}

const PICTURE_STATES_PER_WEIGHTING = LINES_RANGE.max + 1;
const RESTING_NET: Point = [0, 0, 0];

const EMPTY_SEQUENCE: SequenceReading = {
  phase: 0,
  step: 'excite',
  rf: null,
  gradient: null,
  gradientLevel: 0,
  echo: 0,
};

const EMPTY_SPINS: SpinReading = { net: RESTING_NET, arrows: [], precession: 0 };

export function followedAxis(
  gradientAxis: GradientAxisId | null,
  phase: number,
): GradientAxisId | null {
  return gradientAxis ?? activeGradient(phase);
}

export function axisLevel(gradientAxis: GradientAxisId | null, phase: number): number {
  return gradientAxis === null ? gradientLevel(phase) : CHOSEN_AXIS_LEVEL;
}

export function precessionAngle(phase: number): number {
  return wrapAngle((FULL_TURN * PRECESSION_TURNS_PER_CYCLE * phase) / CYCLE_UNITS);
}

export function pictureVersionOf(
  field: FieldId,
  weighting: WeightingId,
  linesFilled: number,
): number {
  const scan = FIELD_IDS.indexOf(field) * WEIGHTING_IDS.length + WEIGHTING_IDS.indexOf(weighting);
  return scan * PICTURE_STATES_PER_WEIGHTING + linesFilled;
}

export function timeGauge(phase: number, weighting: WeightingId): TimeGauge {
  return {
    ms: realMs(phase, weighting),
    totalMs: WEIGHTINGS[weighting].tr,
    share: phase / CYCLE_UNITS,
  };
}

export function lineShare(linesFilled: number): number {
  return linesFilled / LINES_RANGE.max;
}

function writeSequence(
  target: SequenceReading,
  source: SpinSource & Pick<AssemblySource, 'gradientAxis'>,
): void {
  const { phase, weighting, tissue, field, tipAngle, gradientAxis } = source;
  target.phase = phase;
  target.step = phaseOf(phase);
  target.rf = rfPulse(phase);
  target.gradient = followedAxis(gradientAxis, phase);
  target.gradientLevel = axisLevel(gradientAxis, phase);
  target.echo = echoAmplitude(phase, weighting, tissue, field, tipAngle);
}

function writeSpins(target: SpinReading, source: SpinSource): void {
  const { phase, weighting, tissue, field, tipAngle } = source;
  target.net = magnetisation(phase, weighting, tissue, field, tipAngle);
  target.arrows = spinArrows(phase, weighting, tissue, field, tipAngle);
  target.precession = precessionAngle(phase);
}

function writeScan(target: AssemblyState, source: AssemblySource): void {
  const { field, weighting, linesFilled } = source;
  const version = pictureVersionOf(field, weighting, linesFilled);
  if (target.pictureVersion !== version) {
    target.picture = pictureFor(field, weighting, linesFilled);
    target.pictureVersion = version;
  }
  target.fringe.along = FIELDS[field].fringe.along;
  target.fringe.side = FIELDS[field].fringe.side;
}

export function writeAssemblyState(target: AssemblyState, source: AssemblySource): AssemblyState {
  target.phase = source.phase;
  target.playing = source.playing;
  target.field = source.field;
  target.weighting = source.weighting;
  target.tissue = source.tissue;
  target.gradientAxis = source.gradientAxis;
  writeSequence(target.sequence, source);
  writeSpins(target.spins, source);
  writeScan(target, source);
  Object.assign(target.view, source.view);
  return target;
}

export function createAssemblyState(source: AssemblySource): AssemblyState {
  const { phase, playing, field, weighting, tissue, gradientAxis, linesFilled, view } = source;
  const target: AssemblyState = {
    phase,
    playing,
    field,
    weighting,
    tissue,
    gradientAxis,
    sequence: { ...EMPTY_SEQUENCE },
    spins: { ...EMPTY_SPINS },
    picture: pictureFor(field, weighting, linesFilled),
    pictureVersion: pictureVersionOf(field, weighting, linesFilled),
    fringe: { ...FIELDS[field].fringe },
    view: { ...view },
  };
  return writeAssemblyState(target, source);
}
