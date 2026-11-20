export const PART_IDS = [
  'nacelle',
  'intakeLip',
  'fanCase',
  'fanBlades',
  'spinner',
  'guideVanes',
  'splitter',
  'booster',
  'compressorRotor',
  'compressorStator',
  'compressor',
  'outerShaft',
  'innerShaft',
  'gearbox',
  'starter',
  'diffuser',
  'fuelNozzles',
  'combustorLiner',
  'combustor',
  'hpTurbine',
  'lpTurbine',
  'bypassDuct',
  'coldNozzle',
  'hotNozzle',
  'coldStream',
  'hotStream',
  'reverser',
  'cascades',
  'person',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const PHASE_IDS = ['suck', 'squeeze', 'burn', 'spin', 'blow'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = [
  'intake',
  'behindFan',
  'compressorExit',
  'combustorExit',
  'turbinesExit',
] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const PRESET_IDS = [
  'fan',
  'compressor',
  'combustor',
  'turbines',
  'thrust',
  'reverse',
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const CUTAWAY_IDS = ['closed', 'cutaway'] as const;

export type CutawayId = (typeof CUTAWAY_IDS)[number];

export const STREAM_IDS = ['both', 'cold', 'hot'] as const;

export type StreamId = (typeof STREAM_IDS)[number];

export const REVERSER_IDS = ['stowed', 'deployed'] as const;

export type ReverserId = (typeof REVERSER_IDS)[number];

export const LOOK_IDS = ['starter', 'reverser'] as const;

export type LookId = (typeof LOOK_IDS)[number];

export const DETAIL_IDS = ['near', 'far'] as const;

export type DetailId = (typeof DETAIL_IDS)[number];

export const CHAPTER_ACTION_IDS = ['cutaway', 'streams', 'reverser', 'look'] as const;

export type ChapterActionId = (typeof CHAPTER_ACTION_IDS)[number];

export const VIEW_IDS = ['labels', 'person', 'reverser'] as const;

export type ViewId = (typeof VIEW_IDS)[number];

export type ViewOptions = Record<ViewId, boolean>;

export const CAMERA_VIEW_IDS = [
  'hero',
  'compressor',
  'combustor',
  'turbines',
  'side',
  'rear',
  'starter',
] as const;

export type CameraView = (typeof CAMERA_VIEW_IDS)[number];

export const REGION_IDS = [
  'fanFace',
  'compressor',
  'combustor',
  'turbines',
  'engineSide',
  'rear',
  'all',
] as const;

export type RegionId = (typeof REGION_IDS)[number];

export const ANCHOR_IDS = [
  'fanFace',
  'splitter',
  'compressorMid',
  'combustorMid',
  'hpTurbine',
  'lpTurbine',
  'nozzleExit',
  'reverserCascade',
  'person',
  'hotMarker',
  'coldMarker',
] as const;

export type AnchorId = (typeof ANCHOR_IDS)[number];

export type Point = readonly [x: number, y: number, z: number];

export interface EngineReading {
  units: number;
  phase: PhaseId;
  phaseProgress: number;
  axialFraction: number;
  axialMetres: number;
  thrustShare: number;
  heatAtMarker: number;
}

export interface AssemblyState {
  phase: number;
  playing: boolean;
  fanSpeed: number;
  coreSpeed: number;
  fanTurnsPerSecond: number;
  coreTurnsPerSecond: number;
  heat: number;
  flame: number;
  fanBlur: number;
  bladeOpacity: number;
  detail: DetailId;
  coldSpeed: number;
  hotSpeed: number;
  coldDirection: number;
  streams: StreamId;
  cutaway: number;
  reverser: number;
  thrust: number;
  view: ViewOptions;
  reading: EngineReading;
}
