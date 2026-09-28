export const PART_IDS = [
  'sun',
  'roof',
  'panel',
  'frame',
  'glass',
  'encapsulant',
  'cell',
  'ribbon',
  'busbar',
  'finger',
  'backsheet',
  'junctionBox',
  'bypassDiode',
  'connector',
  'dcCable',
  'acCable',
  'inverter',
  'meter',
  'pyramids',
  'arCoating',
  'emitter',
  'junction',
  'base',
  'rearContact',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const LAYER_IDS = [
  'glass',
  'encapsulant',
  'cell',
  'backsheet',
  'frame',
  'junctionBox',
] as const;

export type LayerId = (typeof LAYER_IDS)[number];

export const LAYOUT_IDS = ['halfCut', 'fullCell'] as const;

export type LayoutId = (typeof LAYOUT_IDS)[number];

export const SUN_MOMENT_IDS = ['sunrise', 'noon', 'sunset'] as const;

export type SunMomentId = (typeof SUN_MOMENT_IDS)[number];

export const PHASE_IDS = ['dawn', 'morning', 'noon', 'afternoon', 'dusk'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export type RegionId = 'scene' | 'house' | 'array' | 'panel' | 'stack' | 'slice' | 'inverter';

export type AnchorId = 'panel' | 'sun' | 'slice' | 'inverter' | 'junctionBox';

export interface ViewOptions {
  sun: boolean;
  slice: boolean;
  flow: boolean;
  labels: boolean;
}

export interface AssemblyState {
  minute: number;
  tilt: number;
  explode: number;
  wavelength: number;
  shade: number;
  layout: LayoutId;
  irradiance: number;
  power: number;
  cellTemperature: number;
  deadStrings: readonly boolean[];
  activeDiodes: readonly boolean[];
  view: ViewOptions;
}
