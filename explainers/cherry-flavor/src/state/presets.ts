import type { ScenePreset } from '@core/scene/presetBinder';
import { ODORANT_IDS } from '../ids';
import type { CameraView, FlavorId, PartId, PresetId, ScaleId, SniffId, ViewOptions } from '../ids';
import { FAT_RANGE_PERCENT, MOMENTS, SERVING_RANGE_C } from '../model';
import { REAL_TIME_SPEED } from '../model/playback';

export interface ChapterControls {
  scale: ScaleId;
  flavor: FlavorId;
  sniff: SniffId;
  servingC: number;
  fatPercent: number;
}

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
  start: Partial<ChapterControls>;
}

export const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  scale: 'tongue',
  flavor: 'cherry',
  sniff: 'mix',
  servingC: SERVING_RANGE_C.default,
  fatPercent: FAT_RANGE_PERCENT.default,
};

export const RUN_START = 0;
const IN_MOUTH_AT = MOMENTS.inMouth;
const FIRING_AT = MOMENTS.firing;

const OPEN_NOSE: Partial<ViewOptions> = { pinched: false };
const ODORANTS: readonly PartId[] = [...ODORANT_IDS];

export const PRESETS: Record<PresetId, Preset> = {
  tongue: {
    camera: 'tongue',
    speed: REAL_TIME_SPEED,
    view: OPEN_NOSE,
    startAt: IN_MOUTH_AT,
    start: { scale: 'tongue' },
    labels: ['papilla', 'tasteBud', 'nerve', 'melt'],
    highlight: [],
  },
  routes: {
    camera: 'profile',
    speed: REAL_TIME_SPEED,
    view: OPEN_NOSE,
    startAt: RUN_START,
    start: { scale: 'head' },
    labels: [
      'spoon',
      'bite',
      'nostrils',
      'nasalCavity',
      'smellPatch',
      'palate',
      'airway',
      'tongue',
    ],
    highlight: [],
  },
  receptors: {
    camera: 'receptors',
    speed: REAL_TIME_SPEED,
    view: OPEN_NOSE,
    pauseAt: FIRING_AT,
    start: { scale: 'molecules' },
    labels: ['receptors', 'neuron', 'mucus', 'benzaldehyde'],
    highlight: ['receptors', 'neuron', ...ODORANTS],
  },
  cherry: {
    camera: 'molecules',
    speed: REAL_TIME_SPEED,
    view: OPEN_NOSE,
    pauseAt: FIRING_AT,
    start: { scale: 'molecules', flavor: 'cherry' },
    labels: ODORANTS,
    highlight: ODORANTS,
  },
  desk: {
    camera: 'molecules',
    speed: REAL_TIME_SPEED,
    view: OPEN_NOSE,
    pauseAt: FIRING_AT,
    start: { scale: 'molecules', flavor: 'desk' },
    labels: ODORANTS,
    highlight: ODORANTS,
  },
  iceCream: {
    camera: 'scoop',
    speed: REAL_TIME_SPEED,
    view: OPEN_NOSE,
    startAt: IN_MOUTH_AT,
    start: { scale: 'tongue' },
    labels: ['iceCrystal', 'fatDroplet', 'airBubble', 'melt', 'aromaCloud'],
    highlight: [],
  },
};

export const SCALE_DEFAULT_LABELS: Readonly<Record<ScaleId, readonly PartId[]>> = {
  head: ['bite', 'tongue', 'nostrils', 'smellPatch', 'airway'],
  tongue: ['papilla', 'tasteBud', 'melt', 'aromaCloud'],
  molecules: ['benzaldehyde', 'receptors', 'neuron'],
};
