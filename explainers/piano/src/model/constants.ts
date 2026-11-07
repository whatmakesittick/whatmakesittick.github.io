import type { RegisterId, TouchId } from '../ids';

export interface Range {
  min: number;
  max: number;
}

export const KEY_DIP_MM = 10;
export const BLOW_MM = 47;
export const BLOW_RANGE_MM: Range = { min: 45, max: 47 };
export const LET_OFF_MM = 1.5;
export const LET_OFF_RANGE_MM: Range = { min: 1, max: 3 };
export const ACTION_RATIO = 5.5;
export const ACTION_RATIO_RANGE: Range = { min: 5, max: 6 };
export const CHECK_MM: Readonly<Record<TouchId, number>> = { soft: 13, medium: 15, hard: 16 };
export const HAMMER_SPEED_MS: Readonly<Record<TouchId, number>> = {
  soft: 1.0,
  medium: 1.65,
  hard: 5.0,
};
export const STRIKE_MS: Readonly<Record<TouchId, number>> = { soft: 160, medium: 67, hard: 36 };
export const CONTACT_MS: Readonly<Record<RegisterId, number>> = {
  bass: 4,
  middle: 2,
  treble: 0.8,
};
export const CONTACT_TOUCH_FACTOR: Readonly<Record<TouchId, number>> = {
  soft: 1.2,
  medium: 1.0,
  hard: 0.8,
};
export const DAMPER_LEAD_HARD_MS = 15;
export const REPEAT_RISE_SHARE = 1 / 3;
export const REPEATS_PER_SECOND = { grand: 15, upright: 7 } as const;
export const SHANK_MM = 130;
export const HAMMER_MASS_G = { bass: 11, treble: 3.5 } as const;
export const GRAVITY = 9.81;
export const KEYS = 88;
export const A4_HZ = 440;
export const A4_KEY = 49;
export const SEMITONES_PER_OCTAVE = 12;
export const LONGEST_STRING_M = 2.01;
export const SHORTEST_STRING_M = 0.049;
export const TOTAL_TENSION_T = 20;
export const PARTS_COUNT = 12000;
export const UNDAMPED_TOP: Range = { min: 18, max: 21 };
export const DAMPER_TOP_KEY = 67;
export const PROMPT_DB_S = 8;
export const AFTER_DB_S = 2;
export const SPECTRUM_LIMIT_HZ: Readonly<Record<RegisterId, number>> = {
  bass: 4000,
  middle: 7000,
  treble: 10000,
};
export const PLAYED_KEY: Readonly<Record<RegisterId, number>> = {
  bass: 16,
  middle: 40,
  treble: 76,
};

export const JACK_LEAD_MM = 0.6;
export const DAMPER_LEAVE_KEY_MM = 1.0;
export const DAMPER_RATIO = 1.0;
export const DAMPER_LIFT_MAX_MM = (KEY_DIP_MM - DAMPER_LEAVE_KEY_MM) * DAMPER_RATIO;
export const REBOUND_SHARE = 0.5;
export const HOLD_MS = 2400;
export const RELEASE_MS = 100;
export const REP_LIFT_MM = 2;
export const UPRIGHT_RESET_SHARE = 0.9;
export const UPRIGHT_SOFT_SHARE = 0.5;
export const LEVEL_RANGE_DB = 60;
export const ESCAPE_AT_LET_OFF = 0.6;
export const FELT_SQUASH_MM = 1.0;
export const SYMPATHY_SHARE = 0.08;
export const PLUCK_START_MM = 3.0;
export const PLUCK_RELEASE_MM = 4.0;
export const HARPSICHORD_JACK_RATIO = 1.0;
export const HARPSICHORD_PLUCK_SHARE = 0.6;
export const HARPSICHORD_DECAY_DB_S = 6;
