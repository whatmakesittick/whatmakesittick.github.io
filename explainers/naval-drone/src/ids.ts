export const PART_IDS = [
  'hull',
  'chines',
  'sprayRails',
  'payloadBay',
  'fuelTanks',
  'engine',
  'electronicsBay',
  'starlinkPanels',
  'backupPanel',
  'cameraDome',
  'bowCamera',
  'intake',
  'duct',
  'driveShaft',
  'impeller',
  'waterjet',
  'stator',
  'nozzle',
  'steeringNozzle',
  'reverseBucket',
  'missileRails',
  'jetStream',
  'bowWave',
  'spray',
  'wake',
  'wettedLength',
  'videoGhost',
  'satLink',
  'backupLink',
  'satellite',
  'backupSatellite',
  'groundStation',
  'ship',
  'shipRadar',
  'companions',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const PHASE_IDS = ['launch', 'hump', 'cruise', 'sprint', 'arrival'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = [
  'hullSpeed',
  'humpPeak',
  'onPlane',
  'cruiseSpeed',
  'throttleUp',
  'topSpeed',
  'alongside',
] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const PRESET_IDS = ['overview', 'hull', 'jet', 'link', 'horizon', 'fleet'] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const FIT_IDS = ['standard', 'missile'] as const;

export type FitId = (typeof FIT_IDS)[number];

export const HELM_IDS = ['left', 'straight', 'right', 'reverse'] as const;

export type HelmId = (typeof HELM_IDS)[number];

export const LINK_MODES = ['satellite', 'backup', 'lost'] as const;

export type LinkMode = (typeof LINK_MODES)[number];

export const SEA_STATE_IDS = ['smooth', 'slight', 'moderate', 'rough'] as const;

export type SeaStateId = (typeof SEA_STATE_IDS)[number];

export const SPEED_MARK_IDS = ['hullSpeed', 'hump', 'planing', 'cruise', 'top'] as const;

export type SpeedMarkId = (typeof SPEED_MARK_IDS)[number];

export const HULL_MODES = ['floating', 'hump', 'planing'] as const;

export type HullMode = (typeof HULL_MODES)[number];

export type CameraView = 'chase' | 'waterline' | 'stern' | 'sky' | 'eye' | 'group';

export type RegionId = 'scene' | 'boat' | 'ship' | 'shore';

export type AnchorId =
  'boat' | 'dome' | 'stern' | 'ship' | 'satellite' | 'backupSatellite' | 'groundStation';

export type Point = readonly [x: number, y: number, z: number];

export interface RoutePose {
  position: Point;
  heading: number;
}

export type CompanionReading = RoutePose;

export interface BoatReading extends RoutePose {
  knots: number;
  distance: number;
  held: boolean;
}

export interface PlaningReading {
  knots: number;
  mode: HullMode;
  trim: number;
  heave: number;
  transomDepth: number;
  wettedLength: number;
  keelWettedLength: number;
  chineWettedLength: number;
  liftShare: number;
  speedLengthRatio: number;
}

export interface JetReading {
  throttle: number;
  flow: number;
  jetSpeed: number;
  thrust: number;
  efficiency: number;
  impellerShare: number;
  nozzleAngle: number;
  bucket: number;
}

export interface SeaReading {
  state: SeaStateId;
  waveHeight: number;
}

export interface LinkReading {
  mode: LinkMode;
  ghost: RoutePose | null;
}

export interface ViewOptions {
  cutaway: boolean;
  flow: boolean;
  links: boolean;
  labels: boolean;
}

export interface AssemblyState {
  phase: number;
  playing: boolean;
  boat: BoatReading;
  planing: PlaningReading;
  jet: JetReading;
  companions: readonly CompanionReading[];
  sea: SeaReading;
  link: LinkReading;
  fit: FitId;
  view: ViewOptions;
  waterSection: boolean;
  wettedBar: boolean;
}
