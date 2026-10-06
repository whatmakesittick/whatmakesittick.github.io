import { clamp, smoothstep, toRadians } from '@core/math';
import type { FieldId, Point, TissueId, WeightingId } from '../ids';
import { MOMENTS, PHASE_RANGES, realMs, WEIGHTINGS } from './sequence';
import { RELAXATION } from './tissues';

interface SpinInput {
  weighting: WeightingId;
  tissue: TissueId;
  field: FieldId;
  tipDeg: number;
}

interface SpinState {
  along: number;
  across: number;
  spread: number;
  flip: number;
}

export const SPIN_COUNT = 64;
const SPIN_SEED = 20_260_312;
const JITTER = 0.18;
const FADE_START_UNITS = 800;
const UINT32_RANGE = 2 ** 32;
const MULBERRY = { increment: 0x6d2b79f5, shiftA: 15, shiftB: 7, shiftC: 14, mixB: 61 } as const;

const RESTING: Point = [0, 0, -1];

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY.increment) >>> 0;
    let value = Math.imul(state ^ (state >>> MULBERRY.shiftA), state | 1);
    value ^= value + Math.imul(value ^ (value >>> MULBERRY.shiftB), value | MULBERRY.mixB);
    return ((value ^ (value >>> MULBERRY.shiftC)) >>> 0) / UINT32_RANGE;
  };
}

function randomUnit(random: () => number): Point {
  const z = random() * 2 - 1;
  const angle = random() * Math.PI * 2;
  const ring = Math.sqrt(1 - z * z);
  return [ring * Math.cos(angle), ring * Math.sin(angle), z];
}

const random = seededRandom(SPIN_SEED);
const OFFSETS = Array.from(
  { length: SPIN_COUNT },
  (_, index) => ((index + 0.5) / SPIN_COUNT) * 2 - 1,
);
const JITTERS = OFFSETS.map(() => randomUnit(random));

function steadyAlong(t1: number, tr: number, tipCos: number): number {
  const decay = Math.exp(-tr / t1);
  return (1 - decay) / (1 - decay * tipCos);
}

function dephasing(phase: number): number {
  const [encodeStart, encodeEnd] = PHASE_RANGES.encode;
  const [echoStart, echoEnd] = PHASE_RANGES.echo;
  if (phase < encodeStart) return 0;
  if (phase < encodeEnd) return (phase - encodeStart) / (encodeEnd - encodeStart);
  if (phase < echoStart) return 1;
  if (phase < MOMENTS.echoPeak) return (MOMENTS.echoPeak - phase) / (MOMENTS.echoPeak - echoStart);
  return -clamp((phase - MOMENTS.echoPeak) / (echoEnd - MOMENTS.echoPeak), 0, 1);
}

function spinState(phase: number, input: SpinInput): SpinState {
  const { t1, t2 } = RELAXATION[input.field][input.tissue];
  const tip = toRadians(input.tipDeg);
  const resting = steadyAlong(t1, WEIGHTINGS[input.weighting].tr, Math.cos(tip));
  const tipped = tip * smoothstep(phase, ...PHASE_RANGES.excite);
  const elapsed = realMs(phase, input.weighting);
  const fade = 1 - smoothstep(phase, FADE_START_UNITS, MOMENTS.repetitionEnd);
  return {
    along: 1 - (1 - resting * Math.cos(tipped)) * Math.exp(-elapsed / t1),
    across: resting * Math.sin(tipped) * Math.exp(-elapsed / t2) * fade,
    spread: Math.PI * dephasing(phase),
    flip: Math.PI * smoothstep(phase, ...PHASE_RANGES.refocus),
  };
}

function coherence(spread: number): number {
  return spread === 0 ? 1 : Math.sin(spread) / spread;
}

function transverse({ across, spread }: SpinState): number {
  return across * coherence(Math.abs(spread));
}

export function magnetisation(
  phase: number,
  weighting: WeightingId,
  tissue: TissueId,
  field: FieldId,
  tipDeg: number,
): Point {
  const state = spinState(phase, { weighting, tissue, field, tipDeg });
  return [transverse(state), 0, -state.along];
}

function normalise([x, y, z]: Point): Point {
  const length = Math.hypot(x, y, z);
  return length === 0 ? RESTING : [x / length, y / length, z / length];
}

function spinArrow(state: SpinState, offset: number, jitter: Point): Point {
  const angle = offset * state.spread;
  const lift = Math.sin(angle) * state.across;
  const base = normalise([
    Math.cos(angle) * state.across,
    lift * Math.cos(state.flip),
    lift * Math.sin(state.flip) - state.along,
  ]);
  return normalise([
    base[0] + jitter[0] * JITTER,
    base[1] + jitter[1] * JITTER,
    base[2] + jitter[2] * JITTER,
  ]);
}

export function spinArrows(
  phase: number,
  weighting: WeightingId,
  tissue: TissueId,
  field: FieldId,
  tipDeg: number,
): readonly Point[] {
  const state = spinState(phase, { weighting, tissue, field, tipDeg });
  return OFFSETS.map((offset, index) => spinArrow(state, offset, JITTERS[index]));
}

export function echoAmplitude(
  phase: number,
  weighting: WeightingId,
  tissue: TissueId,
  field: FieldId,
  tipDeg: number,
): number {
  const [echoStart, echoEnd] = PHASE_RANGES.echo;
  if (phase < echoStart || phase >= echoEnd) return 0;
  return clamp(transverse(spinState(phase, { weighting, tissue, field, tipDeg })), 0, 1);
}
