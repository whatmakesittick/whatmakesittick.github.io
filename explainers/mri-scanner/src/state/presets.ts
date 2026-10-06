import type { ScenePreset } from '@core/scene/presetBinder';
import type { CameraView, GradientAxisId, PartId, PresetId, TissueId, ViewOptions } from '../ids';
import { DEFAULT_SPEED, PHASE_RANGES, PICTURE_SPEED } from '../model';

export interface ChapterControls {
  tipAngle: number;
  tissue: TissueId;
  gradientAxis: GradientAxisId | null;
  linesFilled: number;
}

export interface Preset extends ScenePreset<PartId, CameraView> {
  view: Partial<ViewOptions>;
  start?: Partial<ChapterControls>;
}

const LOOP_START = 0;
const OVERVIEW_LINES = 24;
const PICTURE_START_LINES = 8;

const MAGNET_LABELS: readonly PartId[] = [
  'vacuumVessel',
  'radiationShield',
  'heliumVessel',
  'mainCoils',
  'shieldCoils',
  'coldHead',
  'quenchPipe',
  'fringeLine',
];

const SPIN_PARTS: readonly PartId[] = ['spinArrows', 'netMagnet', 'mainField', 'patient'];

const GRADIENT_COILS: readonly PartId[] = ['gradientX', 'gradientY', 'gradientZ', 'sliceSlab'];

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'room',
    speed: DEFAULT_SPEED,
    view: { cutaway: false, fieldLines: false, voxel: false },
    startAt: LOOP_START,
    start: { linesFilled: OVERVIEW_LINES },
    labels: ['cover', 'bore', 'table', 'patient', 'headCoil', 'coldHead', 'screen', 'room'],
    highlight: [],
  },
  magnet: {
    camera: 'cryostat',
    speed: DEFAULT_SPEED,
    view: { cutaway: true, fieldLines: true, voxel: false },
    startAt: LOOP_START,
    labels: MAGNET_LABELS,
    highlight: [...MAGNET_LABELS, 'shims'],
  },
  spins: {
    camera: 'voxel',
    speed: DEFAULT_SPEED,
    view: { cutaway: true, fieldLines: false, voxel: true },
    pauseAt: LOOP_START,
    labels: SPIN_PARTS,
    highlight: [...SPIN_PARTS, 'headCoil'],
  },
  resonance: {
    camera: 'coil',
    speed: DEFAULT_SPEED,
    view: { cutaway: true, fieldLines: false, voxel: true },
    startAt: LOOP_START,
    labels: ['bodyCoil', 'headCoil', 'rfWave', 'echoWave', 'netMagnet'],
    highlight: ['bodyCoil', 'headCoil', 'rfWave', 'echoWave', 'spinArrows', 'netMagnet'],
  },
  gradients: {
    camera: 'gradient',
    speed: DEFAULT_SPEED,
    view: { cutaway: true, fieldLines: false, voxel: false },
    startAt: PHASE_RANGES.encode[0],
    start: { gradientAxis: null },
    labels: [...GRADIENT_COILS, 'bodyCoil'],
    highlight: GRADIENT_COILS,
  },
  picture: {
    camera: 'console',
    speed: PICTURE_SPEED,
    view: { cutaway: false, fieldLines: false, voxel: false },
    startAt: PHASE_RANGES.echo[0],
    start: { linesFilled: PICTURE_START_LINES },
    labels: ['screen', 'headCoil', 'echoWave'],
    highlight: ['screen', 'headCoil', 'patient', 'echoWave'],
  },
};
