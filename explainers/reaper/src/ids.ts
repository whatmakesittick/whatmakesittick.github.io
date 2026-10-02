export const PART_IDS = [
  'fuselage',
  'wing',
  'vTail',
  'ventralFin',
  'noseHump',
  'satelliteDish',
  'sensorBall',
  'fuelTank',
  'engine',
  'propeller',
  'landingGear',
  'pylons',
  'hellfire',
  'bombs',
  'runway',
  'groundStation',
  'losAntenna',
  'losLink',
  'satLink',
  'satellite',
  'sensorCone',
  'laserBeam',
  'missile',
  'target',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const PHASE_IDS = ['takeoff', 'climb', 'handover', 'loiter', 'strike', 'return'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = [
  'liftoff',
  'handover',
  'onStation',
  'launch',
  'impact',
  'handback',
  'touchdown',
] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const LOAD_IDS = ['clean', 'armed'] as const;

export type LoadId = (typeof LOAD_IDS)[number];

export const COMPARISON_IDS = ['predator', 'cessna'] as const;

export type ComparisonId = (typeof COMPARISON_IDS)[number];

export const SENSOR_MODE_IDS = ['day', 'infrared', 'laser'] as const;

export type SensorModeId = (typeof SENSOR_MODE_IDS)[number];

export const PRESET_IDS = ['overview', 'flight', 'link', 'sensor', 'strike', 'endurance'] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export type CameraView = 'chase' | 'side' | 'wide' | 'nose' | 'strike' | 'orbit';

export type RegionId = 'scene' | 'airfield' | 'aircraft' | 'target';

export type AnchorId =
  'aircraft' | 'sensorBall' | 'hump' | 'target' | 'groundStation' | 'satellite' | 'missile';

export type LinkMode = 'los' | 'sat';

export type MissileStage = 'armed' | 'flying' | 'hit' | 'done';

export type Point = readonly [x: number, y: number, z: number];

export interface FlightReading {
  position: Point;
  heading: number;
  pitch: number;
  bank: number;
  gear: number;
  propRate: number;
  airspeed: number;
  altitude: number;
  onGround: boolean;
}

export interface StrikeReading {
  stage: MissileStage;
  share: number;
  launchPoint: Point | null;
  flash: number;
}

export interface SensorReading {
  mode: SensorModeId;
  aim: Point;
  onTarget: boolean;
  lasing: boolean;
}

export interface ViewOptions {
  cutaway: boolean;
  links: boolean;
  track: boolean;
  labels: boolean;
}

export interface AssemblyState {
  phase: number;
  clock: number;
  flight: FlightReading;
  strike: StrikeReading;
  sensor: SensorReading;
  link: LinkMode;
  load: LoadId;
  playing: boolean;
  view: ViewOptions;
}
