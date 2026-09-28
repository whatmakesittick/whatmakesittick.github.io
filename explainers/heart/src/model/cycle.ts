import { clamp } from '@core/math';
import { PHASE_IDS, VALVE_IDS } from '../ids';
import type {
  ConductionId,
  ConductionSite,
  HeartSound,
  PhaseId,
  ValveId,
  ValveState,
  WaveId,
} from '../ids';
import { monotoneCurve } from './curve';

export interface Span {
  readonly start: number;
  readonly end: number;
}

export const BEAT_MS = 800;
export const RESTING_RATE_PER_MINUTE = 75;

export const P_WAVE: Span = { start: 0, end: 80 };
export const ATRIAL_CONTRACTION: Span = { start: 30, end: 170 };
export const QRS: Span = { start: 150, end: 230 };
export const AV_VALVES_CLOSE_MS = 190;
export const SEMILUNAR_OPEN_MS = 240;
export const SEMILUNAR_CLOSE_MS = 510;
export const AV_VALVES_OPEN_MS = 590;
export const EJECTION: Span = { start: SEMILUNAR_OPEN_MS, end: SEMILUNAR_CLOSE_MS };
export const RAPID_FILLING: Span = { start: AV_VALVES_OPEN_MS, end: 740 };
export const DIASTASIS: Span = { start: RAPID_FILLING.end, end: BEAT_MS };
export const T_WAVE: Span = { start: 380, end: 520 };
export const PULMONARY_OFFSET = { open: -10, close: 20 } as const;
export const SOUNDS: Readonly<Record<HeartSound, Span>> = {
  s1: { start: AV_VALVES_CLOSE_MS, end: 260 },
  s2: { start: SEMILUNAR_CLOSE_MS, end: 570 },
};
export const VALVE_TRANSITION_MS = { open: 30, close: 20 } as const;

export const END_DIASTOLIC_ML = 120;
export const END_SYSTOLIC_ML = 50;
export const STROKE_ML = END_DIASTOLIC_ML - END_SYSTOLIC_ML;
export const BEFORE_KICK_ML = 100;
export const AFTER_RAPID_FILL_ML = 96;
export const EJECTION_FRACTION = STROKE_ML / END_DIASTOLIC_ML;

export const PHASE_RANGES: Readonly<Record<PhaseId, Span>> = {
  atria: { start: 0, end: AV_VALVES_CLOSE_MS },
  squeeze: { start: AV_VALVES_CLOSE_MS, end: SEMILUNAR_OPEN_MS },
  eject: EJECTION,
  relax: { start: SEMILUNAR_CLOSE_MS, end: AV_VALVES_OPEN_MS },
  fill: RAPID_FILLING,
  rest: DIASTASIS,
};

export const WAVE_MOMENTS: Readonly<Record<WaveId, number>> = { p: 40, qrs: 178, t: 450 };

export const CONDUCTION_TIMING: Readonly<Record<ConductionId, Span>> = {
  sinusNode: { start: 0, end: 10 },
  atria: { start: 0, end: 80 },
  avNode: { start: 80, end: 150 },
  bundle: { start: 150, end: 162 },
  branches: { start: 162, end: 175 },
  purkinje: { start: 175, end: 190 },
  ventricles: { start: 178, end: 230 },
};

const ATRIAL_GLOW_FADE: Span = { start: 150, end: 250 };
const VENTRICULAR_GLOW_HOLD_END_MS = T_WAVE.start;

const EJECTION_PEAK_SHARE = 0.37;
const EJECTION_PEAK_TURN = 0.5;
const EJECTION_END_TURN = 5 / 6;
const AORTIC_DIASTOLIC_MMHG = 80;
const EJECTION_RISE_MMHG = 40;
const ISOVOLUMIC_START_MMHG = 10;
const RELAXED_MMHG = 8;
const FLOW_STEP_MS = 1;
const MS_PER_SECOND = 1000;
const OPEN_THRESHOLD = 0.5;

const DIASTOLIC_LEFT_VENTRICLE = monotoneCurve(
  [
    [0, 7],
    [30, 7],
    [100, 12],
    [150, 10],
    [AV_VALVES_CLOSE_MS, ISOVOLUMIC_START_MMHG],
    [AV_VALVES_OPEN_MS, RELAXED_MMHG],
    [640, 4],
    [740, 6],
    [800, 7],
  ],
  BEAT_MS,
);

const AORTIC = monotoneCurve(
  [
    [240, 80],
    [340, 120],
    [430, 110],
    [510, 100],
    [522, 95],
    [536, 101],
    [600, 96],
    [700, 90],
    [800, 85],
    [100, 82],
    [190, 80.5],
  ],
  BEAT_MS,
);

const LEFT_ATRIUM = monotoneCurve(
  [
    [0, 6],
    [100, 11],
    [170, 7],
    [200, 8],
    [260, 6],
    [400, 8],
    [590, 10],
    [650, 6],
    [740, 6],
    [800, 6],
  ],
  BEAT_MS,
);

const RIGHT_VENTRICLE = monotoneCurve(
  [
    [0, 3],
    [100, 6],
    [190, 5],
    [230, 10],
    [330, 25],
    [530, 13],
    [600, 3],
    [700, 3],
    [800, 3],
  ],
  BEAT_MS,
);

const PULMONARY_ARTERY = monotoneCurve(
  [
    [230, 10],
    [330, 25],
    [530, 13],
    [545, 11],
    [700, 12],
    [800, 11.5],
    [100, 10.5],
  ],
  BEAT_MS,
);

const RIGHT_ATRIUM = monotoneCurve(
  [
    [0, 3],
    [100, 6],
    [170, 2],
    [200, 4],
    [400, 4],
    [590, 6],
    [650, 2],
    [740, 3],
    [800, 3],
  ],
  BEAT_MS,
);

const ATRIAL_FULLNESS = monotoneCurve(
  [
    [170, 0],
    [190, 0.05],
    [400, 0.6],
    [590, 1],
    [700, 0.45],
    [800, 0.45],
    [30, 0.45],
  ],
  BEAT_MS,
);

interface Gaussian {
  readonly centre: number;
  readonly sigma: number;
  readonly amplitude: number;
}

const ECG_WAVES: readonly Gaussian[] = [
  { centre: 40, sigma: 16, amplitude: 0.15 },
  { centre: 160, sigma: 6, amplitude: -0.12 },
  { centre: 178, sigma: 9, amplitude: 1.2 },
  { centre: 200, sigma: 8, amplitude: -0.3 },
  { centre: 450, sigma: 30, amplitude: 0.3 },
];

export function wrapTime(time: number): number {
  return ((time % BEAT_MS) + BEAT_MS) % BEAT_MS;
}

export function shareOf(span: Span, time: number): number {
  return clamp((time - span.start) / (span.end - span.start), 0, 1);
}

export function within(span: Span, time: number): boolean {
  return time >= span.start && time < span.end;
}

export function phaseAt(time: number): PhaseId {
  const local = wrapTime(time);
  return PHASE_IDS.find((id) => within(PHASE_RANGES[id], local)) ?? 'rest';
}

const LEFT_VENTRICLE_VOLUME = monotoneCurve(
  [
    [0, BEFORE_KICK_ML],
    [ATRIAL_CONTRACTION.start, BEFORE_KICK_ML],
    [100, 110],
    [ATRIAL_CONTRACTION.end, END_DIASTOLIC_ML],
    [EJECTION.start, END_DIASTOLIC_ML],
    [270, 116],
    [300, 105],
    [330, 90],
    [360, 77],
    [400, 65],
    [450, 56],
    [EJECTION.end, END_SYSTOLIC_ML],
    [RAPID_FILLING.start, END_SYSTOLIC_ML],
    [620, 58],
    [650, 72],
    [690, 86],
    [RAPID_FILLING.end, AFTER_RAPID_FILL_ML],
    [BEAT_MS, BEFORE_KICK_ML],
  ],
  BEAT_MS,
);

export function leftVentricleVolume(time: number): number {
  return LEFT_VENTRICLE_VOLUME(time);
}

export function rightVentricleVolume(time: number): number {
  return leftVentricleVolume(time);
}

export function ventricularSqueeze(time: number): number {
  return (END_DIASTOLIC_ML - leftVentricleVolume(time)) / STROKE_ML;
}

export function leftVentricleFlow(time: number): number {
  const before = leftVentricleVolume(time - FLOW_STEP_MS);
  const after = leftVentricleVolume(time + FLOW_STEP_MS);
  return ((before - after) / (2 * FLOW_STEP_MS)) * MS_PER_SECOND;
}

export function aorticFlow(time: number): number {
  return Math.max(0, leftVentricleFlow(time));
}

export function mitralFlow(time: number): number {
  return Math.max(0, -leftVentricleFlow(time));
}

export function atrialFullness(time: number): number {
  return clamp(ATRIAL_FULLNESS(time), 0, 1);
}

function ejectionTurn(share: number): number {
  if (share < EJECTION_PEAK_SHARE) return (EJECTION_PEAK_TURN * share) / EJECTION_PEAK_SHARE;
  const tail = (share - EJECTION_PEAK_SHARE) / (1 - EJECTION_PEAK_SHARE);
  return EJECTION_PEAK_TURN + (EJECTION_END_TURN - EJECTION_PEAK_TURN) * tail;
}

export function leftVentriclePressure(time: number): number {
  const local = wrapTime(time);
  if (local >= AV_VALVES_CLOSE_MS && local < EJECTION.start) {
    const share = shareOf(PHASE_RANGES.squeeze, local);
    return ISOVOLUMIC_START_MMHG + (AORTIC_DIASTOLIC_MMHG - ISOVOLUMIC_START_MMHG) * share * share;
  }
  if (local >= EJECTION.start && local < EJECTION.end) {
    const turn = ejectionTurn(shareOf(EJECTION, local));
    return AORTIC_DIASTOLIC_MMHG + EJECTION_RISE_MMHG * Math.sin(Math.PI * turn);
  }
  if (local >= EJECTION.end && local < AV_VALVES_OPEN_MS) {
    const remaining = 1 - shareOf(PHASE_RANGES.relax, local);
    const closing =
      AORTIC_DIASTOLIC_MMHG + EJECTION_RISE_MMHG * Math.sin(Math.PI * EJECTION_END_TURN);
    return RELAXED_MMHG + (closing - RELAXED_MMHG) * remaining * remaining;
  }
  return DIASTOLIC_LEFT_VENTRICLE(local);
}

export function aorticPressure(time: number): number {
  return AORTIC(time);
}

export function leftAtrialPressure(time: number): number {
  return LEFT_ATRIUM(time);
}

export function rightVentriclePressure(time: number): number {
  return RIGHT_VENTRICLE(time);
}

export function pulmonaryArteryPressure(time: number): number {
  return PULMONARY_ARTERY(time);
}

export function rightAtrialPressure(time: number): number {
  return RIGHT_ATRIUM(time);
}

interface Gate {
  readonly openAt: number;
  readonly closeAt: number;
}

const VALVE_GATES: Readonly<Record<ValveId, Gate>> = {
  tricuspid: { openAt: AV_VALVES_OPEN_MS, closeAt: AV_VALVES_CLOSE_MS },
  mitral: { openAt: AV_VALVES_OPEN_MS, closeAt: AV_VALVES_CLOSE_MS },
  aortic: { openAt: SEMILUNAR_OPEN_MS, closeAt: SEMILUNAR_CLOSE_MS },
  pulmonary: {
    openAt: SEMILUNAR_OPEN_MS + PULMONARY_OFFSET.open,
    closeAt: SEMILUNAR_CLOSE_MS + PULMONARY_OFFSET.close,
  },
};

export function valveOpensAt(valve: ValveId): number {
  return VALVE_GATES[valve].openAt;
}

export function valveClosesAt(valve: ValveId): number {
  return VALVE_GATES[valve].closeAt;
}

export function valveOpening(valve: ValveId, time: number): number {
  const { openAt, closeAt } = VALVE_GATES[valve];
  const sinceOpen = wrapTime(time - openAt);
  const openFor = wrapTime(closeAt - openAt);
  if (sinceOpen >= openFor) return 0;
  if (sinceOpen < VALVE_TRANSITION_MS.open) return sinceOpen / VALVE_TRANSITION_MS.open;
  const untilClose = openFor - sinceOpen;
  if (untilClose < VALVE_TRANSITION_MS.close) return untilClose / VALVE_TRANSITION_MS.close;
  return 1;
}

export function isValveOpen(valve: ValveId, time: number): boolean {
  return valveOpening(valve, time) >= OPEN_THRESHOLD;
}

export function openValves(time: number): ValveId[] {
  return VALVE_IDS.filter((valve) => isValveOpen(valve, time));
}

export function valveState(time: number): ValveState {
  if (isValveOpen('mitral', time) || isValveOpen('tricuspid', time)) return 'avOpen';
  if (isValveOpen('aortic', time) || isValveOpen('pulmonary', time)) return 'semilunarOpen';
  return 'allClosed';
}

export function heartSound(time: number): HeartSound | null {
  const local = wrapTime(time);
  if (within(SOUNDS.s1, local)) return 's1';
  if (within(SOUNDS.s2, local)) return 's2';
  return null;
}

function gaussian({ centre, sigma, amplitude }: Gaussian, time: number): number {
  const offset = (time - centre) / sigma;
  return amplitude * Math.exp(-0.5 * offset * offset);
}

export function ecgMillivolts(time: number): number {
  const local = wrapTime(time);
  return ECG_WAVES.reduce((sum, wave) => sum + gaussian(wave, local), 0);
}

export function ecgWave(time: number): WaveId | null {
  const local = wrapTime(time);
  if (within(P_WAVE, local)) return 'p';
  if (within(QRS, local)) return 'qrs';
  if (within(T_WAVE, local)) return 't';
  return null;
}

export function activation(structure: ConductionId, time: number): number {
  return shareOf(CONDUCTION_TIMING[structure], wrapTime(time));
}

export function atrialGlow(time: number): number {
  const local = wrapTime(time);
  if (local < ATRIAL_GLOW_FADE.start) return activation('atria', local);
  return 1 - shareOf(ATRIAL_GLOW_FADE, local);
}

export function ventricularGlow(time: number): number {
  const local = wrapTime(time);
  if (local < VENTRICULAR_GLOW_HOLD_END_MS) return activation('ventricles', local);
  return 1 - shareOf(T_WAVE, local);
}

const SITE_ORDER: readonly ConductionId[] = [
  'sinusNode',
  'atria',
  'avNode',
  'bundle',
  'branches',
  'purkinje',
  'ventricles',
];

export function conductionSite(time: number): ConductionSite {
  const local = wrapTime(time);
  const active = SITE_ORDER.find((id) => local < CONDUCTION_TIMING[id].end);
  if (active) return active;
  if (local < T_WAVE.start) return 'ventricles';
  if (local < T_WAVE.end) return 'recovering';
  return 'quiet';
}
