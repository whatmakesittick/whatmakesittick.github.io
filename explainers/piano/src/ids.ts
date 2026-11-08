export const PART_IDS = [
  'key',
  'keyboard',
  'capstan',
  'wippen',
  'jack',
  'letOffButton',
  'repetitionLever',
  'knuckle',
  'hammer',
  'backCheck',
  'damper',
  'actions',
  'strings',
  'stringSet',
  'bassStrings',
  'bridge',
  'soundboard',
  'plate',
  'tuningPins',
  'case',
  'pedals',
  'inset',
  'upright',
  'harpsichord',
  'uprightHammer',
  'hammerButt',
  'bridleTape',
  'uprightDamper',
  'uprightStrings',
  'harpsichordJack',
  'tongue',
  'plectrum',
  'harpsichordDamper',
  'harpsichordString',
] as const;
export type PartId = (typeof PART_IDS)[number];

export const LEFT_LABEL_PARTS: readonly PartId[] = [
  'hammer',
  'backCheck',
  'damper',
  'strings',
  'stringSet',
  'bassStrings',
  'bridge',
  'soundboard',
  'plate',
];

const RANKED_LABELS: readonly PartId[] = [
  'inset',
  'hammer',
  'jack',
  'knuckle',
  'letOffButton',
  'repetitionLever',
  'backCheck',
  'damper',
  'key',
  'wippen',
  'capstan',
  'strings',
  'bridge',
  'soundboard',
  'plate',
  'upright',
  'harpsichord',
];

export const LABEL_PRIORITY: readonly PartId[] = [
  ...RANKED_LABELS,
  ...PART_IDS.filter((id) => !RANKED_LABELS.includes(id)),
];

export const PHASE_IDS = ['press', 'escape', 'strike', 'check', 'release'] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = [
  'jackTouch',
  'letOff',
  'strike',
  'checked',
  'repeatReady',
  'damped',
] as const;
export type MomentId = (typeof MOMENT_IDS)[number];

export const PRESET_IDS = ['key', 'lever', 'letGo', 'dampers', 'room', 'compare'] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export const CHAPTER_ACTION_IDS = [
  'touch',
  'pedal',
  'register',
  'compare',
  'moment',
  'sound',
] as const;
export type ChapterActionId = (typeof CHAPTER_ACTION_IDS)[number];

export const TOUCH_IDS = ['soft', 'medium', 'hard'] as const;
export type TouchId = (typeof TOUCH_IDS)[number];

export const PEDAL_IDS = ['none', 'sustain', 'unaCorda'] as const;
export type PedalId = (typeof PEDAL_IDS)[number];

export const REGISTER_IDS = ['bass', 'middle', 'treble'] as const;
export type RegisterId = (typeof REGISTER_IDS)[number];

export const COMPARE_IDS = ['grand', 'upright', 'harpsichord'] as const;
export type CompareId = (typeof COMPARE_IDS)[number];

export const DAMPER_STATE_IDS = ['down', 'rising', 'up', 'falling', 'pedal', 'none'] as const;
export type DamperStateId = (typeof DAMPER_STATE_IDS)[number];

export const SOUND_OPTION_IDS = ['on', 'off'] as const;
export type SoundOptionId = (typeof SOUND_OPTION_IDS)[number];

export const DOCK_VIEW_IDS = ['sound', 'wave', 'inset', 'ghost', 'follow', 'labels'] as const;
export const VIEW_IDS = [...DOCK_VIEW_IDS, 'cutaway', 'lineUp'] as const;
export type DockViewId = (typeof DOCK_VIEW_IDS)[number];
export type ViewId = (typeof VIEW_IDS)[number];
export type ViewOptions = Record<ViewId, boolean>;

export const CAMERA_VIEW_IDS = [
  'grand',
  'action',
  'escapement',
  'dampers',
  'soundboard',
  'lineUp',
] as const;
export type CameraView = (typeof CAMERA_VIEW_IDS)[number];

export const ANCHOR_IDS = ['key', 'hammer', 'jack', 'damper', 'inset', 'bridge', 'lineUp'] as const;
export type AnchorId = (typeof ANCHOR_IDS)[number];

export const REGION_IDS = ['grand', 'action', 'escapement', 'dampers', 'string', 'lineUp'] as const;
export type RegionId = (typeof REGION_IDS)[number];

export type Point = readonly [x: number, y: number, z: number];

export interface ActionPose {
  keyMm: number;
  hammerRiseMm: number;
  hammerToStringMm: number;
  hammerSpeedMs: number;
  contact: boolean;
  feltSquashMm: number;
  jackEscape: number;
  repetitionLift: number;
  checked: boolean;
  damperLiftMm: number;
  damperState: DamperStateId;
  shiftMm: number;
}

export interface UprightPose {
  keyMm: number;
  hammerTravelMm: number;
  hammerToStringMm: number;
  restOffsetMm: number;
  contact: boolean;
  jackEscape: number;
  checked: boolean;
  damperLiftMm: number;
}

export interface HarpsichordPose {
  keyMm: number;
  jackRiseMm: number;
  plectrumBend: number;
  plucked: boolean;
  damperOn: boolean;
  stringShare: number;
}

export interface StrokeReading {
  phase: PhaseId;
  realMs: number;
  levelDb: number | null;
  stringShare: number;
  sympathyShare: number;
  stringsStruck: number;
  strings: number;
  damperState: DamperStateId;
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
  touch: TouchId;
  pedal: PedalId;
  register: RegisterId;
  compare: CompareId;
  stroke: StrokeReading;
  action: ActionPose;
  upright: UprightPose;
  harpsichord: HarpsichordPose;
  view: ViewOptions;
}
