export const PART_IDS = [
  'frame',
  'motorFrontLeft',
  'motorFrontRight',
  'motorRearLeft',
  'motorRearRight',
  'propellers',
  'battery',
  'stack',
  'camera',
  'videoAntenna',
  'receiverAntenna',
  'gpsModule',
  'groundStation',
  'controlLink',
  'videoLink',
  'spinArrows',
  'crossroads',
  'launchPad',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const MOTOR_PART_IDS = [
  'motorRearRight',
  'motorFrontRight',
  'motorRearLeft',
  'motorFrontLeft',
] as const satisfies readonly PartId[];

export type MotorPartId = (typeof MOTOR_PART_IDS)[number];

export const PHASE_IDS = ['takeoff', 'climb', 'transit', 'orbit', 'return', 'landing'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = ['liftoff', 'cruise', 'onStation', 'turnHome', 'touchdown'] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const VIDEO_IDS = ['analogue', 'digital'] as const;

export type VideoId = (typeof VIDEO_IDS)[number];

export const MOVE_IDS = ['hover', 'forward', 'roll', 'yaw', 'climb'] as const;

export type MoveId = (typeof MOVE_IDS)[number];

export const FLIGHT_MODE_IDS = ['acro', 'angle', 'horizon'] as const;

export type FlightModeId = (typeof FLIGHT_MODE_IDS)[number];

export const PACKET_RATES = [50, 150, 250, 500] as const;

export type PacketRate = (typeof PACKET_RATES)[number];

export const SPEEDSTER_IDS = ['longRange', 'racer', 'record'] as const;

export type SpeedsterId = (typeof SPEEDSTER_IDS)[number];

export const PRESET_IDS = ['overview', 'flight', 'controller', 'link', 'power', 'limits'] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export type CameraView = 'chase' | 'top' | 'close' | 'side' | 'pilot' | 'fpv';

export type RegionId = 'scene' | 'station' | 'drone' | 'crossroads' | 'route';

export type AnchorId = 'drone' | 'camera' | 'station' | 'crossroads';

export type SpinDirection = 'clockwise' | 'counterClockwise';

export type Point = readonly [x: number, y: number, z: number];

export type MotorShares = readonly [m1: number, m2: number, m3: number, m4: number];

export interface FlightReading {
  position: Point;
  heading: number;
  pitch: number;
  roll: number;
  speedKmh: number;
  height: number;
  verticalSpeed: number;
  onGround: boolean;
  armed: boolean;
  propRate: number;
}

export interface MotorReading {
  shares: MotorShares;
}

export interface BatteryReading {
  share: number;
  volts: number;
  amps: number;
  usedMah: number;
}

export interface LinkReading {
  distance: number;
  signal: number;
}

export interface ViewOptions {
  links: boolean;
  track: boolean;
  arrows: boolean;
  labels: boolean;
}

export interface AssemblyState {
  phase: number;
  flight: FlightReading;
  motors: MotorReading;
  battery: BatteryReading;
  link: LinkReading;
  video: VideoId;
  move: MoveId;
  playing: boolean;
  view: ViewOptions;
}
