export const PART_IDS = [
  'barrel',
  'chamber',
  'muzzle',
  'rifling',
  'trunnion',
  'bolt',
  'firingPin',
  'extractor',
  'carrier',
  'chargingHandle',
  'pistonRod',
  'pistonHead',
  'gasBlock',
  'gasPort',
  'gasTube',
  'ventHoles',
  'returnSpring',
  'hammer',
  'trigger',
  'selector',
  'ejector',
  'receiver',
  'magazine',
  'cartridgeCase',
  'primer',
  'powder',
  'bullet',
  'spentCase',
  'hotGas',
  'stock',
  'grip',
  'handguard',
  'rearSight',
  'frontSight',
  'cleaningRod',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const PHASE_IDS = ['strike', 'barrel', 'unlock', 'eject', 'feed', 'ready'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = [
  'strike',
  'start',
  'peak',
  'port',
  'exit',
  'unlock',
  'eject',
  'strip',
  'lock',
] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const GAS_PORT_IDS = ['open', 'blocked'] as const;

export type GasPortId = (typeof GAS_PORT_IDS)[number];

export const COMPARISON_IDS = ['blink', 'sound', 'car'] as const;

export type ComparisonId = (typeof COMPARISON_IDS)[number];

export const PRESET_IDS = ['overview', 'cartridge', 'firing', 'barrel', 'gas', 'reload'] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export type CameraView = 'hero' | 'action' | 'cartridge' | 'barrel' | 'gasSystem' | 'reload';

export type RegionId =
  'scene' | 'rifle' | 'receiver' | 'chamber' | 'barrel' | 'gasSystem' | 'reloadBay';

export type AnchorId =
  | 'muzzle'
  | 'chamber'
  | 'gasBlock'
  | 'carrier'
  | 'bolt'
  | 'hammer'
  | 'magazine'
  | 'ejectionPort'
  | 'bullet';

export type BulletStage = 'seated' | 'moving' | 'gone';

export interface ShotReading {
  pressure: number;
  travel: number;
  speed: number;
  spin: number;
  turns: number;
  stage: BulletStage;
  muzzleFlash: number;
  gas: number;
}

export interface MotionReading {
  carrier: number;
  bolt: number;
  hammer: number;
  spring: number;
  caseFlight: number;
  feed: number;
  trigger: number;
}

export interface ViewOptions {
  cutaway: boolean;
  gas: boolean;
  trail: boolean;
  labels: boolean;
}

export interface AssemblyState {
  time: number;
  shot: ShotReading;
  motion: MotionReading;
  gasPort: GasPortId;
  playing: boolean;
  view: ViewOptions;
}
