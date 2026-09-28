export const PART_IDS = [
  'case',
  'dial',
  'hourHand',
  'minuteHand',
  'secondHand',
  'crown',
  'stem',
  'windingPinion',
  'crownWheel',
  'ratchetWheel',
  'click',
  'barrel',
  'barrelArbor',
  'mainspring',
  'mainplate',
  'barrelBridge',
  'trainBridge',
  'balanceCock',
  'jewels',
  'centreWheel',
  'thirdWheel',
  'fourthWheel',
  'escapeWheel',
  'palletFork',
  'entryPallet',
  'exitPallet',
  'bankingPins',
  'roller',
  'impulseJewel',
  'balanceWheel',
  'hairspring',
  'stud',
  'regulator',
  'shockJewel',
  'cannonPinion',
  'minuteWheel',
  'hourWheel',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const WHEEL_IDS = [
  'barrel',
  'centreWheel',
  'thirdWheel',
  'fourthWheel',
  'escapeWheel',
] as const;

export type WheelId = (typeof WHEEL_IDS)[number];

export const MOMENT_IDS = ['lock', 'unlock', 'impulse', 'drop', 'free'] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const BEAT_RATE_IDS = ['vph18000', 'vph21600', 'vph28800', 'vph36000'] as const;

export type BeatRateId = (typeof BEAT_RATE_IDS)[number];

export const PHASE_IDS = ['swingIn', 'tick', 'swingOut', 'swingBack', 'tock', 'swingHome'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export type RegionId =
  'scene' | 'movement' | 'barrel' | 'train' | 'escapement' | 'balance' | 'dial' | 'motionWorks';

export type AnchorId = WheelId | 'fork' | 'balance' | 'crown';

export interface ViewOptions {
  dial: boolean;
  bridges: boolean;
  energy: boolean;
  labels: boolean;
}

export interface AssemblyState {
  phase: number;
  cycles: number;
  amplitude: number;
  reserve: number;
  regulator: number;
  view: ViewOptions;
}
