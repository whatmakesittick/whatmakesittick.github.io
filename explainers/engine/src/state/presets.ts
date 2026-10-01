import type { ScenePreset } from '@core/scene/presetBinder';
import type { EngineLayout, EngineType } from '../model';

export type PresetId =
  | 'overview'
  | 'strokes'
  | 'cycle'
  | 'valves'
  | 'ignition'
  | 'crank'
  | 'compression'
  | 'fuel'
  | 'inline4'
  | 'controls';

export type CameraView = 'overview' | 'side' | 'head' | 'ignition' | 'crank' | 'wide';

export type PartId =
  | 'piston'
  | 'connectingRod'
  | 'crankshaft'
  | 'flywheel'
  | 'cylinder'
  | 'combustionChamber'
  | 'intakeValve'
  | 'exhaustValve'
  | 'intakeCam'
  | 'exhaustCam'
  | 'intakePort'
  | 'exhaustPort'
  | 'sparkPlug'
  | 'injector';

export type ViewOptions = {
  cutaway: boolean;
  gas: boolean;
  labels: boolean;
  flow: boolean;
};

export interface Preset extends ScenePreset<PartId, CameraView> {
  id: PresetId;
  layout?: EngineLayout;
  engineType?: EngineType;
  view?: Partial<ViewOptions>;
}

const HEAD_PARTS: readonly PartId[] = [
  'intakeValve',
  'exhaustValve',
  'intakeCam',
  'exhaustCam',
  'intakePort',
  'exhaustPort',
];
const IGNITION_PARTS: readonly PartId[] = ['sparkPlug', 'injector'];
const CRANK_PARTS: readonly PartId[] = ['connectingRod', 'crankshaft', 'flywheel'];

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    id: 'overview',
    camera: 'overview',
    layout: 'single',
    view: { cutaway: true, gas: true, flow: true },
    speed: 60,
    labels: [],
    highlight: [],
  },
  strokes: {
    id: 'strokes',
    camera: 'side',
    layout: 'single',
    view: { cutaway: true, gas: true, flow: true },
    speed: 40,
    labels: ['piston', 'intakeValve', 'exhaustValve'],
    highlight: ['piston', 'combustionChamber'],
  },
  cycle: {
    id: 'cycle',
    camera: 'side',
    layout: 'single',
    speed: 30,
    labels: ['crankshaft', 'piston'],
    highlight: ['crankshaft', 'connectingRod'],
  },
  valves: {
    id: 'valves',
    camera: 'head',
    layout: 'single',
    view: { cutaway: true, flow: true },
    speed: 30,
    labels: HEAD_PARTS,
    highlight: HEAD_PARTS,
  },
  ignition: {
    id: 'ignition',
    camera: 'ignition',
    layout: 'single',
    view: { cutaway: true, gas: true },
    speed: 15,
    labels: IGNITION_PARTS,
    highlight: [...IGNITION_PARTS, 'combustionChamber'],
  },
  crank: {
    id: 'crank',
    camera: 'crank',
    layout: 'single',
    speed: 40,
    labels: CRANK_PARTS,
    highlight: CRANK_PARTS,
  },
  compression: {
    id: 'compression',
    camera: 'side',
    layout: 'single',
    view: { cutaway: true, gas: true },
    labels: ['combustionChamber'],
    highlight: ['combustionChamber', 'piston'],
    pauseAt: 360,
  },
  fuel: {
    id: 'fuel',
    camera: 'side',
    layout: 'single',
    view: { cutaway: true, gas: true, flow: true },
    speed: 30,
    labels: IGNITION_PARTS,
    highlight: ['combustionChamber', ...IGNITION_PARTS],
  },
  inline4: {
    id: 'inline4',
    camera: 'wide',
    layout: 'inline4',
    view: { cutaway: true, gas: true },
    speed: 60,
    labels: [],
    highlight: [],
  },
  controls: {
    id: 'controls',
    camera: 'overview',
    labels: [],
    highlight: [],
  },
};

export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];
