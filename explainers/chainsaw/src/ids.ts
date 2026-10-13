export const PART_IDS = [
  'powerhead',
  'rearHandle',
  'throttleTrigger',
  'frontHandle',
  'handGuard',
  'starter',
  'sparkPlug',
  'cylinder',
  'piston',
  'connectingRod',
  'crankshaft',
  'crankcase',
  'exhaustPort',
  'transferPorts',
  'intakePort',
  'muffler',
  'carburettor',
  'throttleValve',
  'chokeValve',
  'airFilter',
  'fuelTank',
  'pulseLine',
  'clutch',
  'clutchDrum',
  'sprocket',
  'chainBrakeBand',
  'oilPump',
  'oilTank',
  'bar',
  'barNose',
  'chain',
  'cutters',
  'depthGauges',
  'driveLinks',
  'chainCatcher',
  'kickbackZone',
  'freshCharge',
  'exhaustGas',
  'oilFlow',
  'log',
  'chips',
  'fuelCap',
  'oilCap',
  'starterGrip',
  'starterRope',
  'starterPulley',
  'pawls',
  'flywheel',
  'ignitionCoil',
  'primerBulb',
  'chokeLever',
  'decompressionValve',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const PHASE_IDS = ['power', 'exhaust', 'scavenge', 'compression'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = [
  'topDeadCentre',
  'intakeCloses',
  'exhaustOpens',
  'transfersOpen',
  'bottomDeadCentre',
  'transfersClose',
  'exhaustCloses',
  'intakeOpens',
  'spark',
] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const PORT_IDS = ['exhaust', 'transfer', 'intake'] as const;

export type PortId = (typeof PORT_IDS)[number];

export const PRESET_IDS = [
  'saw',
  'engine',
  'fuel',
  'starting',
  'clutch',
  'chain',
  'kickback',
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const SETTING_IDS = ['cutting', 'bench', 'kickback'] as const;

export type SettingId = (typeof SETTING_IDS)[number];

export const PRESET_SETTINGS: Readonly<Record<PresetId, SettingId>> = {
  saw: 'cutting',
  engine: 'bench',
  fuel: 'bench',
  starting: 'bench',
  clutch: 'bench',
  chain: 'cutting',
  kickback: 'kickback',
};

export const THROTTLE_CHOICE_IDS = ['idle', 'half', 'full'] as const;

export type ThrottleChoiceId = (typeof THROTTLE_CHOICE_IDS)[number];

export const BRAKE_CHOICE_IDS = ['off', 'on'] as const;

export type BrakeChoiceId = (typeof BRAKE_CHOICE_IDS)[number];

export const KICKBACK_CHOICE_IDS = ['strong'] as const;

export type KickbackChoiceId = (typeof KICKBACK_CHOICE_IDS)[number];

export const START_CHOICE_IDS = ['cold'] as const;

export type StartChoiceId = (typeof START_CHOICE_IDS)[number];

export const ENGINE_STATE_IDS = ['stopped', 'cranking', 'fastIdle', 'running'] as const;

export type EngineStateId = (typeof ENGINE_STATE_IDS)[number];

export const START_STEP_IDS = [
  'brake',
  'choke',
  'decompression',
  'primer',
  'firstPull',
  'pop',
  'chokeOff',
  'secondPull',
  'fastIdle',
  'idle',
] as const;

export type StartStepId = (typeof START_STEP_IDS)[number];

export const START_DISPLAY_IDS = ['ready', ...START_STEP_IDS, 'done'] as const;

export type StartDisplayId = (typeof START_DISPLAY_IDS)[number];

export const CLUTCH_STATE_IDS = ['open', 'driving', 'slipping'] as const;

export type ClutchStateId = (typeof CLUTCH_STATE_IDS)[number];

export const CHOICE_IDS = ['throttle'] as const;

export type ChoiceId = (typeof CHOICE_IDS)[number];

export const CHAPTER_ACTION_IDS = ['throttle', 'brake', 'kickback', 'start'] as const;

export type ChapterActionId = (typeof CHAPTER_ACTION_IDS)[number];

export const VIEW_IDS = ['cutaway', 'flow', 'zone', 'labels'] as const;

export type ViewId = (typeof VIEW_IDS)[number];

export type ViewOptions = Record<ViewId, boolean>;

export const CAMERA_VIEW_IDS = [
  'sawSide',
  'cylinderCut',
  'carburettor',
  'starterSide',
  'clutchSprocket',
  'barChain',
  'kickbackWide',
] as const;

export type CameraView = (typeof CAMERA_VIEW_IDS)[number];

export const REGION_IDS = [
  'saw',
  'cylinder',
  'carb',
  'starter',
  'clutch',
  'bar',
  'kickback',
] as const;

export type RegionId = (typeof REGION_IDS)[number];

export const ANCHOR_IDS = ['crank', 'sprocket', 'nose', 'rearGrip'] as const;

export type AnchorId = (typeof ANCHOR_IDS)[number];

export type PlanePoint = readonly [x: number, y: number];

export type Point = readonly [x: number, y: number, z: number];

export interface PortReading {
  exhaust: number;
  transfer: number;
  intake: number;
}

export interface FlowReading {
  intake: number;
  transfer: number;
  exhaust: number;
  burn: number;
}

export interface CrankReading {
  angle: number;
  phase: PhaseId;
  rpm: number;
  degPerSecond: number;
  sparkGlow: number;
  ports: PortReading;
  flows: FlowReading;
  crankcasePressure: number;
}

export interface DriveReading {
  throttle: number;
  clutch: ClutchStateId;
  shoesOut: number;
  chainMm: number;
  drumDeg: number;
  chainSpeed: number;
  oiling: boolean;
}

export interface SafetyReading {
  brake: boolean;
  kickback: boolean;
  riseDeg: number;
  guardForward: number;
}

export interface StartReading {
  starting: boolean;
  step: StartStepId;
  engine: EngineStateId;
  chokeLever: number;
  decompressionIn: boolean;
  primerSqueeze: number;
  ropeOut: number;
  pulleyDeg: number;
  pawlsEngaged: boolean;
}

export interface AssemblyState {
  setting: SettingId;
  phase: number;
  playing: boolean;
  crank: CrankReading;
  drive: DriveReading;
  safety: SafetyReading;
  start: StartReading;
  view: ViewOptions;
}
