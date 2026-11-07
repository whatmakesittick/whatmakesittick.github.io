import type { PedalId, RegisterId, TouchId } from '../ids';
import { CYCLE_UNITS, MOMENTS, damperAt, wrapUnits } from '../model';

export interface SoundSnapshot {
  phase: number;
  playing: boolean;
  preset: string;
  touch: TouchId;
  pedal: PedalId;
  register: RegisterId;
  view: { readonly sound: boolean };
}

export type StrikeSource = Pick<SoundSnapshot, 'phase' | 'playing' | 'preset'>;
export type DamperSource = Pick<SoundSnapshot, 'phase' | 'touch' | 'pedal' | 'register'>;

const HALF_CYCLE = CYCLE_UNITS / 2;

function unitsAhead(from: number, to: number): number {
  return wrapUnits(to - from);
}

function reachesStrike(span: number, toStrike: number): boolean {
  return span < HALF_CYCLE && toStrike > 0 && toStrike <= span;
}

function crossedForward(from: number, to: number): boolean {
  return reachesStrike(unitsAhead(from, to), unitsAhead(from, MOMENTS.strike));
}

function crossedBackward(from: number, to: number): boolean {
  return reachesStrike(unitsAhead(to, from), unitsAhead(MOMENTS.strike, from));
}

function isPlaying(prev: StrikeSource, next: StrikeSource): boolean {
  return prev.playing && next.playing;
}

export function strikeCrossed(prev: StrikeSource, next: StrikeSource): boolean {
  if (prev.preset !== next.preset) return false;
  if (crossedForward(prev.phase, next.phase)) return true;
  return !isPlaying(prev, next) && crossedBackward(prev.phase, next.phase);
}

export function damperDown(state: DamperSource): boolean {
  return damperAt(state.phase, state.touch, state.pedal, state.register).state === 'down';
}
