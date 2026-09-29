export const PART_IDS = [
  'gimbal',
  'actuators',
  'oxygenInlet',
  'methaneInlet',
  'oxygenPump',
  'methanePump',
  'oxygenPreburner',
  'methanePreburner',
  'hotGasManifold',
  'injector',
  'chamber',
  'throat',
  'coolingChannels',
  'nozzle',
  'plume',
  'shockDiamonds',
  'liquidOxygen',
  'liquidMethane',
  'oxygenRichGas',
  'methaneRichGas',
  'booster',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const PHASE_IDS = ['start', 'liftoff', 'climb', 'maxQ', 'thinAir', 'cutoff'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const PROPELLANT_IDS = ['methane', 'oxygen'] as const;

export type PropellantId = (typeof PROPELLANT_IDS)[number];

export const ENGINE_IDS = ['merlin', 'rs25', 'rd180', 'raptor'] as const;

export type EngineId = (typeof ENGINE_IDS)[number];

export const MOMENT_IDS = ['liftoff', 'maxQ', 'cutoff'] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const STREAM_IDS = [
  'liquidOxygen',
  'liquidMethane',
  'oxygenRichGas',
  'methaneRichGas',
] as const;

export type StreamId = (typeof STREAM_IDS)[number];

export type PlumeState = 'squeezed' | 'matched' | 'spreading';

export type RegionId =
  | 'scene'
  | 'engine'
  | 'hero'
  | 'powerhead'
  | 'turbopumps'
  | 'chamber'
  | 'nozzle'
  | 'nozzleAndPlume'
  | 'booster';

export type AnchorId =
  | 'gimbal'
  | 'oxygenPump'
  | 'methanePump'
  | 'oxygenPreburner'
  | 'methanePreburner'
  | 'injector'
  | 'chamber'
  | 'throat'
  | 'nozzleExit'
  | 'plume';

export interface ViewOptions {
  cutaway: boolean;
  flow: boolean;
  flame: boolean;
  cluster: boolean;
  labels: boolean;
}

export interface AssemblyState {
  phase: number;
  propellant: PropellantId;
  view: ViewOptions;
}
