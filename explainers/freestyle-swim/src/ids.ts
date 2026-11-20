export const PART_IDS = [
  'hand',
  'forearm',
  'elbow',
  'shoulder',
  'head',
  'hips',
  'foot',
  'waterline',
  'laneRope',
  'laneLine',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const PHASE_IDS = ['entryCatch', 'pull', 'push', 'recovery'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = ['entry', 'catch', 'underShoulder', 'pushEnd', 'recoveryMid'] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const PRESET_IDS = ['stroke', 'catch', 'pull', 'roll', 'kick', 'drag'] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const PACE_IDS = ['easy', 'middle', 'sprint'] as const;

export type PaceId = (typeof PACE_IDS)[number];

export const KICK_IDS = ['two', 'six'] as const;

export type KickId = (typeof KICK_IDS)[number];

export const BREATH_IDS = ['none', 'right'] as const;

export type BreathId = (typeof BREATH_IDS)[number];

export const HEAD_IDS = ['down', 'up'] as const;

export type HeadId = (typeof HEAD_IDS)[number];

export const ARM_IDS = ['right', 'left'] as const;

export type ArmId = (typeof ARM_IDS)[number];

export const CHAPTER_ACTION_IDS = ['pace', 'kick', 'breath', 'head'] as const;

export type ChapterActionId = (typeof CHAPTER_ACTION_IDS)[number];

export const VIEW_IDS = ['labels', 'forces', 'underwater', 'handPath'] as const;

export type ViewId = (typeof VIEW_IDS)[number];

export type ViewOptions = Record<ViewId, boolean>;

export const CAMERA_VIEW_IDS = ['whole', 'catch', 'pull', 'roll', 'kick', 'drag'] as const;

export type CameraView = (typeof CAMERA_VIEW_IDS)[number];

export const REGION_IDS = ['body', 'rightArm', 'shoulders', 'legs', 'forebody'] as const;

export type RegionId = (typeof REGION_IDS)[number];

export const ANCHOR_IDS = ['swimmer', 'rightHand', 'head'] as const;

export type AnchorId = (typeof ANCHOR_IDS)[number];

export interface ArmReading {
  phase: PhaseId;
  progress: number;
  underwater: boolean;
  elbowDeg: number | null;
  handDepthM: number | null;
  handSpeedMs: number;
  handForceN: number;
}

export interface LegReading {
  beats: number;
  phase: number;
  depthM: number;
}

export interface StrokeReading {
  units: number;
  pace: PaceId;
  kick: KickId;
  breathing: BreathId;
  right: ArmReading;
  left: ArmReading;
  shoulderRollDeg: number;
  hipRollDeg: number;
  headTurn: number;
  breathExtraDeg: number;
  legs: { left: LegReading; right: LegReading };
  speedMs: number;
  surgeM: number;
  scrollM: number;
  dragN: number;
  dragFactor: number;
  entrySplash: Record<ArmId, number>;
  pullingHand: ArmId;
}

export interface AssemblyState {
  phase: number;
  playing: boolean;
  reading: StrokeReading;
  pace: PaceId;
  kick: KickId;
  breathing: BreathId;
  headUp: boolean;
  dragFactor: number;
  entrySplash: Record<ArmId, number>;
  view: ViewOptions;
}
