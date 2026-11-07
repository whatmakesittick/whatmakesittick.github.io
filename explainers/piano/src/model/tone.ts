import type { PedalId, RegisterId, TouchId } from '../ids';
import { REGISTER_IDS } from '../ids';
import {
  A4_HZ,
  A4_KEY,
  AFTER_DB_S,
  CONTACT_MS,
  HAMMER_SPEED_MS,
  LEVEL_RANGE_DB,
  PLAYED_KEY,
  PROMPT_DB_S,
  SEMITONES_PER_OCTAVE,
  SPECTRUM_LIMIT_HZ,
} from './constants';
import { hasDamper, isWound, strikeShare, stringsPerNote } from './layout';
import { MS_PER_SECOND } from './scale';
import { contactMs } from './timing';

export interface Note {
  key: number;
  hz: number;
  strings: number;
  wound: boolean;
  inharmonicity: number;
  t60Seconds: number;
  t60SustainSeconds: number;
  contactMs: number;
  damper: boolean;
}

export interface Decay {
  promptDbPerSecond: number;
  afterDbPerSecond: number;
  afterDb: number;
}

export interface PartialTone {
  hz: number;
  amplitude: number;
}

export interface NoteSpec extends Decay {
  partials: readonly PartialTone[];
  stringDetuneCents: readonly number[];
  peakGain: number;
  attackSeconds: number;
  partialDampingStep: number;
  damped: boolean;
}

export const INHARMONICITY: Readonly<Record<RegisterId, number>> = {
  bass: 3.8e-5,
  middle: 3.3e-4,
  treble: 6.4e-3,
};
export const T60_SECONDS: Readonly<Record<RegisterId, { held: number; sustain: number }>> = {
  bass: { held: 20.3, sustain: 18.1 },
  middle: { held: 9.5, sustain: 15.3 },
  treble: { held: 12.0, sustain: 12.0 },
};
export const MAX_PARTIALS: Readonly<Record<RegisterId, number>> = {
  bass: 16,
  middle: 12,
  treble: 12,
};
export const SPECTRAL_SLOPE_DB: Readonly<Record<TouchId, number>> = {
  soft: -12,
  medium: -9,
  hard: -6,
};
export const UNA_CORDA_SLOPE_DB = -3;
export const STRING_DETUNE_CENTS = [0, 0.5, -0.5] as const;
export const MIN_ATTACK_SECONDS = 0.0005;
export const PARTIAL_DAMPING_STEP = 0.1;
export const STRETCH_PARTIAL: Readonly<Record<RegisterId, number>> = {
  bass: 8,
  middle: 8,
  treble: 4,
};
export const MIN_PARTIAL_AMPLITUDE = 1e-4;

const CENTS_PER_OCTAVE = 1200;
const DB_PER_AMPLITUDE_DECADE = 20;
const DB_PER_OCTAVE_PER_POWER = DB_PER_AMPLITUDE_DECADE * Math.log10(2);

export function fundamentalHz(register: RegisterId): number {
  return A4_HZ * 2 ** ((PLAYED_KEY[register] - A4_KEY) / SEMITONES_PER_OCTAVE);
}

function noteFor(register: RegisterId): Note {
  const key = PLAYED_KEY[register];
  return {
    key,
    hz: fundamentalHz(register),
    strings: stringsPerNote(key),
    wound: isWound(key),
    inharmonicity: INHARMONICITY[register],
    t60Seconds: T60_SECONDS[register].held,
    t60SustainSeconds: T60_SECONDS[register].sustain,
    contactMs: CONTACT_MS[register],
    damper: hasDamper(key),
  };
}

export const NOTES: Readonly<Record<RegisterId, Note>> = Object.fromEntries(
  REGISTER_IDS.map((register) => [register, noteFor(register)]),
) as Record<RegisterId, Note>;

function stretch(n: number, register: RegisterId): number {
  return Math.sqrt(1 + INHARMONICITY[register] * n * n);
}

export function partialHz(n: number, register: RegisterId): number {
  return n * fundamentalHz(register) * stretch(n, register);
}

export function centsSharp(n: number, register: RegisterId): number {
  return CENTS_PER_OCTAVE * Math.log2(stretch(n, register));
}

export function partialCount(register: RegisterId): number {
  const limit = SPECTRUM_LIMIT_HZ[register];
  let count = 0;
  while (count < MAX_PARTIALS[register] && partialHz(count + 1, register) <= limit) count += 1;
  return count;
}

export function stringsStruck(register: RegisterId, pedal: PedalId): number {
  const strings = NOTES[register].strings;
  return pedal === 'unaCorda' ? strings - 1 : strings;
}

function amplitudeDb(share: number): number {
  return DB_PER_AMPLITUDE_DECADE * Math.log10(share);
}

export function dbToGain(db: number): number {
  return 10 ** (db / DB_PER_AMPLITUDE_DECADE);
}

export function peakLevelDb(touch: TouchId, pedal: PedalId, register: RegisterId): number {
  const speedShare = HAMMER_SPEED_MS[touch] / HAMMER_SPEED_MS.hard;
  const stringShare = stringsStruck(register, pedal) / NOTES[register].strings;
  return amplitudeDb(speedShare) + amplitudeDb(stringShare);
}

export function t60For(pedal: PedalId, register: RegisterId): number {
  const { held, sustain } = T60_SECONDS[register];
  return pedal === 'sustain' ? sustain : held;
}

export function decayFor(pedal: PedalId, register: RegisterId): Decay {
  return {
    promptDbPerSecond: PROMPT_DB_S,
    afterDbPerSecond: AFTER_DB_S,
    afterDb: LEVEL_RANGE_DB - AFTER_DB_S * t60For(pedal, register),
  };
}

export function fallDbAfter(seconds: number, decay: Decay): number {
  const prompt = decay.promptDbPerSecond * seconds;
  const after = decay.afterDb + decay.afterDbPerSecond * seconds;
  return Math.min(prompt, after);
}

export function levelDbAfter(
  seconds: number,
  touch: TouchId,
  pedal: PedalId,
  register: RegisterId,
): number {
  return peakLevelDb(touch, pedal, register) - fallDbAfter(seconds, decayFor(pedal, register));
}

export function noteDamped(pedal: PedalId, register: RegisterId): boolean {
  return NOTES[register].damper && pedal !== 'sustain';
}

function slopeFor(touch: TouchId, pedal: PedalId): number {
  return SPECTRAL_SLOPE_DB[touch] + (pedal === 'unaCorda' ? UNA_CORDA_SLOPE_DB : 0);
}

export function partialAmplitudes(
  touch: TouchId,
  pedal: PedalId,
  register: RegisterId,
): readonly number[] {
  const power = slopeFor(touch, pedal) / DB_PER_OCTAVE_PER_POWER;
  const share = strikeShare(NOTES[register].key);
  const raw = Array.from({ length: partialCount(register) }, (_, index) => {
    const n = index + 1;
    return Math.abs(Math.sin(n * Math.PI * share)) * n ** power;
  });
  const total = raw.reduce((sum, value) => sum + value, 0);
  return raw.map((value) => value / total);
}

export function noteSpec(touch: TouchId, pedal: PedalId, register: RegisterId): NoteSpec {
  const partials = partialAmplitudes(touch, pedal, register)
    .map((amplitude, index) => ({ hz: partialHz(index + 1, register), amplitude }))
    .filter(({ amplitude }) => amplitude >= MIN_PARTIAL_AMPLITUDE);
  return {
    ...decayFor(pedal, register),
    partials,
    stringDetuneCents: STRING_DETUNE_CENTS.slice(0, stringsStruck(register, pedal)),
    peakGain: dbToGain(peakLevelDb(touch, pedal, register)),
    attackSeconds: Math.max(MIN_ATTACK_SECONDS, contactMs(touch, register) / MS_PER_SECOND),
    partialDampingStep: PARTIAL_DAMPING_STEP,
    damped: noteDamped(pedal, register),
  };
}
