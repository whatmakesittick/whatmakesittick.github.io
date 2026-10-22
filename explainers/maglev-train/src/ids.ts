export const PART_IDS = [
  'train',
  'wrapArms',
  'supportMagnets',
  'guidanceMagnets',
  'eddyBrakes',
  'skids',
  'guideway',
  'statorPacks',
  'guidanceRails',
  'feederCable',
  'piers',
  'stations',
  'poweredSection',
  'travellingWave',
  'gapInset',
  'powerFlow',
  'ghostTrain',
  'scmaglev',
  'wheelRail',
  'gapCallouts',
] as const;
export type PartId = (typeof PART_IDS)[number];

export const LEFT_LABEL_PARTS: readonly PartId[] = [
  'wrapArms',
  'supportMagnets',
  'skids',
  'statorPacks',
  'piers',
  'gapInset',
  'ghostTrain',
  'scmaglev',
  'feederCable',
  'poweredSection',
];

const RANKED_LABELS: readonly PartId[] = [
  'gapInset',
  'supportMagnets',
  'statorPacks',
  'travellingWave',
  'guidanceMagnets',
  'wrapArms',
  'poweredSection',
  'eddyBrakes',
  'skids',
  'powerFlow',
  'scmaglev',
  'wheelRail',
  'gapCallouts',
  'train',
];

export const LABEL_PRIORITY: readonly PartId[] = [
  ...RANKED_LABELS,
  ...PART_IDS.filter((id) => !RANKED_LABELS.includes(id)),
];

export const PHASE_IDS = ['liftOff', 'accelerate', 'cruise', 'brake', 'settle'] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = ['lifted', 'fullSpeed', 'brakeStart', 'touchdown'] as const;
export type MomentId = (typeof MOMENT_IDS)[number];

export const PRESET_IDS = ['ride', 'float', 'centre', 'motor', 'stop', 'compare'] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export const CHAPTER_ACTION_IDS = ['topSpeed', 'brakeMode', 'nudge', 'compare', 'moment'] as const;
export type ChapterActionId = (typeof CHAPTER_ACTION_IDS)[number];

export const TOP_SPEED_IDS = ['kmh430', 'kmh300'] as const;
export type TopSpeedId = (typeof TOP_SPEED_IDS)[number];

export const BRAKE_MODE_IDS = ['regen', 'eddy'] as const;
export type BrakeModeId = (typeof BRAKE_MODE_IDS)[number];

export const NUDGE_IDS = ['bump', 'gust'] as const;
export type NudgeId = (typeof NUDGE_IDS)[number];

export const COMPARE_IDS = ['transrapid', 'scmaglev', 'wheelRail'] as const;
export type CompareId = (typeof COMPARE_IDS)[number];

export const POWER_FLOW_IDS = ['none', 'drive', 'regen', 'battery'] as const;
export type PowerFlowId = (typeof POWER_FLOW_IDS)[number];

export const ONBOARD_IDS = ['rails', 'generator', 'battery'] as const;
export type OnboardId = (typeof ONBOARD_IDS)[number];

export const DOCK_VIEW_IDS = ['wave', 'gap', 'ghost', 'labels'] as const;
export const VIEW_IDS = [...DOCK_VIEW_IDS, 'cutaway', 'lineUp'] as const;
export type DockViewId = (typeof DOCK_VIEW_IDS)[number];
export type ViewId = (typeof VIEW_IDS)[number];
export type ViewOptions = Record<ViewId, boolean>;

export const CAMERA_VIEW_IDS = ['ride', 'arm', 'section', 'wave', 'rear', 'lineUp'] as const;
export type CameraView = (typeof CAMERA_VIEW_IDS)[number];

export const ANCHOR_IDS = ['nose', 'tail', 'arm', 'inset', 'cut', 'lineUp'] as const;
export type AnchorId = (typeof ANCHOR_IDS)[number];

export const REGION_IDS = ['train', 'front', 'arm', 'crossSection', 'rear', 'lineUp'] as const;
export type RegionId = (typeof REGION_IDS)[number];

export type Point = readonly [x: number, y: number, z: number];

export interface MotionReading {
  phase: PhaseId;
  realSeconds: number;
  distance: number;
  speedMs: number;
  speedKmh: number;
  gapMm: number;
  liftMm: number;
  onSkids: boolean;
  sliding: boolean;
}

export interface WaveReading {
  on: boolean;
  reversed: boolean;
  hz: number;
  sectionIndex: number;
  nextSectionIndex: number | null;
  sectionStart: number;
  sectionEnd: number;
}

export interface PowerReading {
  flow: PowerFlowId;
  onboard: OnboardId;
  eddy: boolean;
}

export interface GhostReading {
  distance: number;
  speedKmh: number;
  behind: number;
}

export interface NudgeState {
  id: NudgeId | null;
  token: number;
}

export interface ChaseTarget {
  position: Point;
  heading: number;
  pitch: number;
  roll: number;
  span: number;
}

export interface AssemblyState {
  phase: number;
  playing: boolean;
  topSpeed: TopSpeedId;
  brakeMode: BrakeModeId;
  motion: MotionReading;
  wave: WaveReading;
  power: PowerReading;
  ghost: GhostReading;
  nudge: NudgeState;
  compare: CompareId;
  view: ViewOptions;
}
