export const SCALE_IDS = ['beaker', 'molecules'] as const;

export type ScaleId = (typeof SCALE_IDS)[number];

export const BEAKER_PART_IDS = [
  'mixingBeaker',
  'mixture',
  'pourBeaker',
  'bisulfiteSolution',
  'pourStream',
  'stirBar',
  'stirrer',
  'thermometer',
  'stopwatch',
] as const;

export const MOLECULE_PART_IDS = [
  'iodate',
  'bisulfite',
  'sulfate',
  'iodide',
  'hydrogenIon',
  'iodine',
  'triiodide',
  'polyiodide',
  'amylose',
  'glucose',
  'water',
] as const;

export const PART_IDS = [...BEAKER_PART_IDS, ...MOLECULE_PART_IDS] as const;

export type PartId = (typeof PART_IDS)[number];

function scaleOfParts<T extends PartId>(ids: readonly T[], scale: ScaleId): Record<T, ScaleId> {
  return Object.fromEntries(ids.map((id) => [id, scale])) as Record<T, ScaleId>;
}

export const PART_SCALE: Readonly<Record<PartId, ScaleId>> = {
  ...scaleOfParts(BEAKER_PART_IDS, 'beaker'),
  ...scaleOfParts(MOLECULE_PART_IDS, 'molecules'),
};

export const PHASE_IDS = ['pour', 'induction', 'exhaustion', 'iodine', 'complex', 'blue'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = ['mixed', 'switch', 'visible', 'deepBlue'] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const PRESET_IDS = [
  'pour',
  'slowStep',
  'invisibleIodine',
  'tippingPoint',
  'starch',
  'tuning',
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const MIX_CHOICE_IDS = ['again'] as const;

export type MixChoiceId = (typeof MIX_CHOICE_IDS)[number];

export const CHAPTER_ACTION_IDS = ['scale', 'mix'] as const;

export type ChapterActionId = (typeof CHAPTER_ACTION_IDS)[number];

export const STEP_IDS = ['landolt', 'dushman', 'eaten', 'triiodide', 'helix'] as const;

export type StepId = (typeof STEP_IDS)[number];

export const STEP_STATE_IDS = ['waiting', 'running', 'finished'] as const;

export type StepStateId = (typeof STEP_STATE_IDS)[number];

export const IODINE_STAGE_IDS = ['meet', 'formed', 'eaten'] as const;

export type IodineStageId = (typeof IODINE_STAGE_IDS)[number];

export const ELEMENT_IDS = ['I', 'S', 'O', 'H'] as const;

export type ElementId = (typeof ELEMENT_IDS)[number];

export const VIEW_IDS = ['water', 'labels'] as const;

export type ViewId = (typeof VIEW_IDS)[number];

export type ViewOptions = Record<ViewId, boolean>;

export const CAMERA_VIEW_IDS = ['bench', 'landolt', 'iodine', 'beaker', 'helix', 'tuning'] as const;

export type CameraView = (typeof CAMERA_VIEW_IDS)[number];

export const VIEW_SCALE: Readonly<Record<CameraView, ScaleId>> = {
  bench: 'beaker',
  landolt: 'molecules',
  iodine: 'molecules',
  beaker: 'beaker',
  helix: 'molecules',
  tuning: 'beaker',
};

export const SCALE_PARTNER: Readonly<Record<CameraView, CameraView>> = {
  bench: 'landolt',
  landolt: 'beaker',
  iodine: 'beaker',
  beaker: 'iodine',
  helix: 'beaker',
  tuning: 'iodine',
};

export const REGION_IDS = ['bench', 'beaker', 'tuning', 'solution', 'event', 'helix'] as const;

export type RegionId = (typeof REGION_IDS)[number];

export const REGION_SCALE: Readonly<Record<RegionId, ScaleId>> = {
  bench: 'beaker',
  beaker: 'beaker',
  tuning: 'beaker',
  solution: 'molecules',
  event: 'molecules',
  helix: 'molecules',
};

export const ANCHOR_IDS = ['liquidCentre', 'eventCentre', 'helixCentre'] as const;

export type AnchorId = (typeof ANCHOR_IDS)[number];

export const ANCHOR_SCALE: Readonly<Record<AnchorId, ScaleId>> = {
  liquidCentre: 'beaker',
  eventCentre: 'molecules',
  helixCentre: 'molecules',
};

export type Point = readonly [x: number, y: number, z: number];

export const SPECIES_IDS = [
  'iodate',
  'bisulfite',
  'sulfate',
  'iodide',
  'hydrogenIon',
  'iodine',
] as const;

export type SpeciesId = (typeof SPECIES_IDS)[number];

export type SpeciesCounts = Record<SpeciesId, number>;

export interface Molarities {
  iodateM: number;
  bisulfiteM: number;
  sulfateM: number;
  iodideM: number;
  acidM: number;
  iodineM: number;
}

export interface ClockReading extends Molarities {
  seconds: number;
  switchSeconds: number;
  phase: PhaseId;
  phaseProgress: number;
  pour: number;
  stirDeg: number;
  temperatureC: number;
  lifetimeSeconds: number;
  colour: number;
  complex: number;
  counts: SpeciesCounts;
}

export interface LandoltEvent {
  active: boolean;
  cycle: number;
  hop: number;
}

export interface IodineEvent {
  active: boolean;
  cycle: number;
  stage: IodineStageId;
  progress: number;
}

export interface AssemblyState {
  scale: ScaleId;
  phase: number;
  playing: boolean;
  clock: ClockReading;
  landolt: LandoltEvent;
  iodineEvent: IodineEvent;
  view: ViewOptions;
}
