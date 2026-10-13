import type { ScenePreset } from '@core/scene/presetBinder';
import type { CameraView, PartId, PresetId, ViewOptions } from '../ids';
import { DEFAULT_SPEED, SLOW_SPEED, THROTTLE_PRESETS } from '../model';

export interface ChapterControls {
  throttle: number;
  brake: boolean;
  kickback: boolean;
  kickbackSeconds: number;
}

export interface Preset extends ScenePreset<PartId, CameraView> {
  view: Partial<ViewOptions>;
  start?: Partial<ChapterControls>;
}

const TOP_OF_TURN = 0;
const ENGINE_START = 300;
const FUEL_START = 260;

const FULL: Partial<ChapterControls> = { throttle: THROTTLE_PRESETS.full };
const IDLE: Partial<ChapterControls> = { throttle: THROTTLE_PRESETS.idle };

const ENGINE_LABELS: readonly PartId[] = [
  'sparkPlug',
  'cylinder',
  'piston',
  'connectingRod',
  'crankshaft',
  'crankcase',
  'exhaustPort',
  'transferPorts',
  'intakePort',
];

const FUEL_LABELS: readonly PartId[] = [
  'carburettor',
  'throttleValve',
  'chokeValve',
  'airFilter',
  'fuelTank',
  'pulseLine',
  'intakePort',
  'crankcase',
];

const STARTING_LABELS: readonly PartId[] = [
  'starterGrip',
  'starterPulley',
  'pawls',
  'flywheel',
  'ignitionCoil',
  'primerBulb',
  'chokeLever',
  'decompressionValve',
  'handGuard',
  'fuelCap',
  'oilCap',
];

export const PRESETS: Record<PresetId, Preset> = {
  saw: {
    camera: 'sawSide',
    speed: DEFAULT_SPEED,
    view: { cutaway: false, flow: false, zone: false },
    startAt: TOP_OF_TURN,
    start: FULL,
    labels: [
      'rearHandle',
      'throttleTrigger',
      'frontHandle',
      'handGuard',
      'powerhead',
      'starter',
      'bar',
      'chain',
      'log',
    ],
    highlight: [],
  },
  engine: {
    camera: 'cylinderCut',
    speed: SLOW_SPEED,
    view: { cutaway: true, flow: true, zone: false },
    startAt: ENGINE_START,
    start: FULL,
    labels: ENGINE_LABELS,
    highlight: [...ENGINE_LABELS, 'muffler', 'freshCharge', 'exhaustGas'],
  },
  fuel: {
    camera: 'carburettor',
    speed: DEFAULT_SPEED,
    view: { cutaway: true, flow: true, zone: false },
    startAt: FUEL_START,
    start: IDLE,
    labels: FUEL_LABELS,
    highlight: [...FUEL_LABELS, 'freshCharge'],
  },
  starting: {
    camera: 'starterSide',
    speed: DEFAULT_SPEED,
    view: { cutaway: true, flow: false, zone: false },
    startAt: TOP_OF_TURN,
    start: { throttle: THROTTLE_PRESETS.idle, brake: false },
    labels: STARTING_LABELS,
    highlight: [...STARTING_LABELS, 'starterRope', 'starter', 'sparkPlug', 'chainBrakeBand'],
  },
  clutch: {
    camera: 'clutchSprocket',
    speed: DEFAULT_SPEED,
    view: { cutaway: true, flow: false, zone: false },
    startAt: TOP_OF_TURN,
    start: IDLE,
    labels: [
      'clutch',
      'clutchDrum',
      'sprocket',
      'crankshaft',
      'chainBrakeBand',
      'oilPump',
      'chain',
    ],
    highlight: [
      'clutch',
      'clutchDrum',
      'sprocket',
      'chainBrakeBand',
      'oilPump',
      'oilFlow',
      'chain',
    ],
  },
  chain: {
    camera: 'barChain',
    speed: DEFAULT_SPEED,
    view: { cutaway: false, flow: true, zone: false },
    startAt: TOP_OF_TURN,
    start: FULL,
    labels: ['cutters', 'depthGauges', 'driveLinks', 'chain', 'bar', 'barNose', 'chips'],
    highlight: ['cutters', 'depthGauges', 'driveLinks', 'chain', 'bar', 'barNose', 'oilFlow'],
  },
  kickback: {
    camera: 'kickbackWide',
    speed: DEFAULT_SPEED,
    view: { cutaway: true, flow: false, zone: true },
    startAt: TOP_OF_TURN,
    start: { throttle: THROTTLE_PRESETS.full, brake: false },
    labels: [
      'kickbackZone',
      'barNose',
      'handGuard',
      'frontHandle',
      'chainBrakeBand',
      'chainCatcher',
    ],
    highlight: [
      'powerhead',
      'bar',
      'kickbackZone',
      'barNose',
      'handGuard',
      'chainBrakeBand',
      'chainCatcher',
    ],
  },
};
