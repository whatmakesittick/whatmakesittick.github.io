export const SCENE_IDS = ['farm', 'turbine'] as const;

export type SceneId = (typeof SCENE_IDS)[number];

export const TURBINE_PART_IDS = [
  'land',
  'foundation',
  'tower',
  'transformer',
  'towerCable',
  'nacelle',
  'cooler',
  'bedplate',
  'hub',
  'blades',
  'pitchCylinders',
  'mainBearing',
  'mainShaft',
  'gearbox',
  'brakeDisc',
  'generator',
  'converter',
  'yawDrives',
  'sweptArea',
  'streamlinesGroup',
  'heroWake',
] as const;

export const FARM_PART_IDS = [
  'farmLand',
  'farmTurbines',
  'accessRoads',
  'spacingMarker',
  'prevailingWind',
  'windArrows',
  'shearProfile',
  'wakePlumes',
  'collectorCables',
  'substation',
  'gridLine',
] as const;

export const PART_IDS = [...TURBINE_PART_IDS, ...FARM_PART_IDS] as const;

export type PartId = (typeof PART_IDS)[number];

export const SCENE_PARTS: Readonly<Record<SceneId, readonly PartId[]>> = {
  turbine: TURBINE_PART_IDS,
  farm: FARM_PART_IDS,
};

export const PHASE_IDS = ['night', 'morning', 'afternoon', 'storm', 'evening'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const PRESET_IDS = ['farm', 'tower', 'nacelle', 'curve', 'wakes', 'grid'] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const PRESET_SCENES: Readonly<Record<PresetId, SceneId>> = {
  farm: 'farm',
  tower: 'turbine',
  nacelle: 'turbine',
  curve: 'turbine',
  wakes: 'farm',
  grid: 'farm',
};

export const SITE_WIND_IDS = ['calm', 'typical', 'windy'] as const;

export type SiteWindId = (typeof SITE_WIND_IDS)[number];

export const SPACING_OPTIONS = [5, 7, 9] as const;

export type SpacingD = (typeof SPACING_OPTIONS)[number];

export const SPACING_CHOICE_IDS = ['5', '7', '9'] as const;

export type SpacingChoiceId = (typeof SPACING_CHOICE_IDS)[number];

export const OPERATING_STATE_IDS = [
  'idle',
  'partial',
  'full',
  'rampDown',
  'stopping',
  'parked',
  'starting',
] as const;

export type OperatingStateId = (typeof OPERATING_STATE_IDS)[number];

export const NACELLE_CHOICE_IDS = ['closed', 'open'] as const;

export type NacelleChoiceId = (typeof NACELLE_CHOICE_IDS)[number];

export const WIND_PRESET_IDS = ['cutIn', 'peak', 'rated', 'rampDown', 'cutOut'] as const;

export type WindPresetId = (typeof WIND_PRESET_IDS)[number];

export const FOLLOW_DAY = 'day';

export const WIND_AT_IDS = [FOLLOW_DAY, ...WIND_PRESET_IDS] as const;

export type WindAtId = (typeof WIND_AT_IDS)[number];

export const CHOICE_IDS = ['siteWind'] as const;

export type ChoiceId = (typeof CHOICE_IDS)[number];

export const CHAPTER_ACTION_IDS = ['siteWind', 'spacing', 'nacelle', 'windAt'] as const;

export type ChapterActionId = (typeof CHAPTER_ACTION_IDS)[number];

export const VIEW_IDS = ['streamlines', 'wakes', 'cables', 'labels', 'cutaway'] as const;

export type ViewId = (typeof VIEW_IDS)[number];

export type ViewOptions = Record<ViewId, boolean>;

export type CameraView =
  | 'farmAerial'
  | 'turbineTall'
  | 'nacelleCutaway'
  | 'rotorQuarter'
  | 'wakeStreaks'
  | 'gridSubstation';

export type RegionId = 'farm' | 'wakes' | 'grid' | 'turbine' | 'nacelle' | 'rotor';

export type AnchorId = 'hub' | 'yawPivot' | 'towerBase' | 'farmCentre' | 'heroSite' | 'substation';

export type Point = readonly [x: number, y: number, z: number];

export type RowIndex = 0 | 1 | 2;

export interface FarmSite {
  row: RowIndex;
  column: number;
  x: number;
  z: number;
}

export interface WindReading {
  speed: number;
  fromDeg: number;
  induction: number;
}

export interface RotorReading {
  rpm: number;
  pitchDeg: number;
  yawDeg: number;
  state: OperatingStateId;
  braked: boolean;
  powerShare: number;
}

export interface FarmReading {
  spacing: SpacingD;
  sites: readonly FarmSite[];
  deficits: readonly number[];
  plumeLengthD: number;
  plumeStrength: number;
  outputShare: number;
}

export interface AssemblyState {
  scene: SceneId;
  phase: number;
  playing: boolean;
  wind: WindReading;
  rotor: RotorReading;
  farm: FarmReading;
  view: ViewOptions;
}
