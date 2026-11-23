export const PART_IDS = [
  'head',
  'shoulder',
  'arm',
  'elbow',
  'trunk',
  'pelvis',
  'hip',
  'thigh',
  'knee',
  'shin',
  'achilles',
  'arch',
  'heel',
  'shoe',
  'road',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const GROUP_IDS = [
  'head',
  'trunk',
  'arm',
  'pelvis',
  'thigh',
  'shin',
  'foot',
  'shoe',
  'backdrop',
] as const;

export type GroupId = (typeof GROUP_IDS)[number];

export const PART_GROUPS: Readonly<Record<PartId, readonly GroupId[]>> = {
  head: ['head'],
  shoulder: ['trunk', 'arm'],
  arm: ['arm'],
  elbow: ['arm'],
  trunk: ['trunk'],
  pelvis: ['pelvis'],
  hip: ['pelvis', 'thigh'],
  thigh: ['thigh'],
  knee: ['thigh', 'shin'],
  shin: ['shin'],
  achilles: ['shin', 'shoe'],
  arch: ['shoe'],
  heel: ['shoe'],
  shoe: ['shoe'],
  road: ['backdrop'],
};

export const PHASE_IDS = ['landing', 'pushOff', 'recovery', 'reach'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = [
  'touchdown',
  'peakForce',
  'midStance',
  'toeOff',
  'midFloat',
  'leftTouchdown',
  'midSwing',
] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const PRESET_IDS = ['stride', 'touchdown', 'spring', 'liftoff', 'posture', 'pace'] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const PACE_IDS = ['easy', 'steady', 'fast'] as const;

export type PaceId = (typeof PACE_IDS)[number];

export const ARMS_IDS = ['swing', 'held'] as const;

export type ArmsId = (typeof ARMS_IDS)[number];

export const LOOK_IDS = ['front', 'above'] as const;

export type LookId = (typeof LOOK_IDS)[number];

export const CHAPTER_ACTION_IDS = ['pace', 'arms', 'look'] as const;

export type ChapterActionId = (typeof CHAPTER_ACTION_IDS)[number];

export const VIEW_IDS = ['labels', 'forces', 'formLines', 'footPath', 'follow'] as const;

export type ViewId = (typeof VIEW_IDS)[number];

export type ViewOptions = Record<ViewId, boolean>;

export const CAMERA_VIEW_IDS = ['hero', 'foot', 'leg', 'behind', 'front', 'above', 'wide'] as const;

export type CameraView = (typeof CAMERA_VIEW_IDS)[number];

export const REGION_IDS = ['body', 'upperBody', 'stanceLeg', 'footZone', 'roadAhead'] as const;

export type RegionId = (typeof REGION_IDS)[number];

export const ANCHOR_IDS = ['runner', 'pelvis', 'rightFoot', 'head'] as const;

export type AnchorId = (typeof ANCHOR_IDS)[number];

export const SIDE_IDS = ['right', 'left'] as const;

export type SideId = (typeof SIDE_IDS)[number];

export interface GroundForce {
  fwdBW: number;
  vertBW: number;
  rightBW: number;
}

export interface LegReading {
  hipFlexDeg: number;
  hipAddDeg: number;
  hipRotDeg: number;
  kneeFlexDeg: number;
  kneeAddDeg: number;
  kneeRotDeg: number;
  ankleDorsiDeg: number;
  ankleInvDeg: number;
  ankleRotDeg: number;
  phase: PhaseId;
  contact: boolean;
  stanceShare: number | null;
  roadTravelM: number | null;
  force: GroundForce;
}

export interface TimingReading {
  cadence: number;
  stepTimeS: number;
  strideTimeS: number;
  contactTimeS: number;
  flightTimeS: number;
  stepLengthM: number;
  strideLengthM: number;
  speedMs: number;
  floatShare: number;
  dutyFactor: number;
}

export interface ForceReading extends GroundForce {
  onFoot: SideId | null;
}

export interface ComReading {
  heightM: number;
  surgeM: number;
  speedDeltaMs: number;
  risePeakToPeakM: number;
  surgePeakToPeakM: number;
  speedSwingMs: number;
}

export interface SidePair {
  right: number;
  left: number;
}

export interface UpperReading {
  leanDeg: number;
  pelvisTiltDeg: number;
  pelvisRollDeg: number;
  pelvisRotDeg: number;
  trunkTwistDeg: number;
  shoulderRotDeg: number;
  shoulderFlexDeg: SidePair;
  elbowDeg: SidePair;
  headPitchDeg: number;
  holdsArms: boolean;
}

export interface GaitReading {
  units: number;
  pace: PaceId;
  stepRate: number;
  arms: ArmsId;
  right: LegReading;
  left: LegReading;
  float: 0 | 1 | 2;
  timing: TimingReading;
  force: ForceReading;
  com: ComReading;
  landing: { reachM: number };
  upper: UpperReading;
}

export interface AssemblyState {
  phase: number;
  playing: boolean;
  reading: GaitReading;
  pace: PaceId;
  stepRate: number;
  arms: ArmsId;
  scrollM: number;
  view: ViewOptions;
}
