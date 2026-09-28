export const PART_IDS = [
  'membrane',
  'cRing',
  'subunitA',
  'centralStalk',
  'peripheralStalk',
  'alphaSubunits',
  'betaSubunits',
  'openSite',
  'looseSite',
  'tightSite',
  'adpPhosphate',
  'atp',
  'protons',
  'pumps',
  'electrons',
  'oxygen',
  'matrix',
  'intermembraneSpace',
  'neighbourMotors',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const PHASE_IDS = ['firstAtp', 'secondAtp', 'thirdAtp'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const SITE_STATES = ['open', 'loose', 'tight'] as const;

export type SiteState = (typeof SITE_STATES)[number];

export const SITE_PARTS: Readonly<Record<SiteState, PartId>> = {
  open: 'openSite',
  loose: 'looseSite',
  tight: 'tightSite',
};

export const BETA_INDICES = [0, 1, 2] as const;

export type BetaIndex = (typeof BETA_INDICES)[number];

export const RING_IDS = ['animal', 'yeast', 'chloroplast'] as const;

export type RingId = (typeof RING_IDS)[number];

export const EVENT_IDS = ['m100', 'm200', 'm400', 'm800', 'm1500', 'm5000', 'marathon'] as const;

export type EventId = (typeof EVENT_IDS)[number];

export const TRAINING_IDS = ['untrained', 'tenWeeks', 'years'] as const;

export type TrainingId = (typeof TRAINING_IDS)[number];

export type RegionId = 'scene' | 'motor' | 'rotor' | 'head' | 'pumps' | 'row';

export type AnchorId = 'ring' | 'gate' | 'head' | 'pumps';

export interface ViewOptions {
  membrane: boolean;
  cutaway: boolean;
  flow: boolean;
  labels: boolean;
}

export interface AssemblyState {
  rotorDeg: number;
  laps: number;
  degreesPerSecond: number;
  bladeCount: number;
  motorCount: number;
  view: ViewOptions;
}
