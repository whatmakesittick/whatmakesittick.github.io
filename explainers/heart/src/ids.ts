export const PART_IDS = [
  'rightAtrium',
  'rightVentricle',
  'leftAtrium',
  'leftVentricle',
  'septum',
  'wall',
  'apex',
  'tricuspidValve',
  'pulmonaryValve',
  'mitralValve',
  'aorticValve',
  'chordae',
  'aorta',
  'archBranches',
  'pulmonaryTrunk',
  'pulmonaryArteries',
  'superiorVenaCava',
  'inferiorVenaCava',
  'pulmonaryVeins',
  'coronaries',
  'sinusNode',
  'avNode',
  'bundleBranches',
  'purkinjeFibres',
  'venousBlood',
  'arterialBlood',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const CHAMBER_IDS = [
  'rightAtrium',
  'rightVentricle',
  'leftAtrium',
  'leftVentricle',
] as const;

export type ChamberId = (typeof CHAMBER_IDS)[number];

export const VALVE_IDS = ['tricuspid', 'pulmonary', 'mitral', 'aortic'] as const;

export type ValveId = (typeof VALVE_IDS)[number];

export const VALVE_PARTS: Readonly<Record<ValveId, PartId>> = {
  tricuspid: 'tricuspidValve',
  pulmonary: 'pulmonaryValve',
  mitral: 'mitralValve',
  aortic: 'aorticValve',
};

export const WAVE_IDS = ['p', 'qrs', 't'] as const;

export type WaveId = (typeof WAVE_IDS)[number];

export const PHASE_IDS = ['atria', 'squeeze', 'eject', 'relax', 'fill', 'rest'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const CONDUCTION_IDS = [
  'sinusNode',
  'atria',
  'avNode',
  'bundle',
  'branches',
  'purkinje',
  'ventricles',
] as const;

export type ConductionId = (typeof CONDUCTION_IDS)[number];

export type ConductionSite = ConductionId | 'recovering' | 'quiet';

export type ValveState = 'avOpen' | 'allClosed' | 'semilunarOpen';

export type HeartSound = 's1' | 's2';

export type RegionId =
  | 'scene'
  | 'heart'
  | 'chambers'
  | 'leftHeart'
  | 'rightHeart'
  | 'conduction'
  | 'valves'
  | 'atria'
  | 'ventricles';

export type AnchorId =
  | 'apex'
  | 'tricuspid'
  | 'pulmonary'
  | 'mitral'
  | 'aortic'
  | 'sinusNode'
  | 'avNode'
  | 'rightAtrium'
  | 'rightVentricle'
  | 'leftAtrium'
  | 'leftVentricle';

export interface ViewOptions {
  cutaway: boolean;
  flow: boolean;
  conduction: boolean;
  labels: boolean;
}

export interface AssemblyState {
  time: number;
  chamber: ChamberId;
  valve: ValveId;
  view: ViewOptions;
}
