import type { ScenePreset } from '@core/scene/presetBinder';
import type { CameraView, PartId, PresetId, ScaleId, ViewOptions } from '../ids';
import { IODATE_RANGE_MM, PHASE_RANGES, TEMPERATURE_RANGE_C } from '../model';
import { REAL_TIME_SPEED } from '../model/playback';

export interface ChapterControls {
  scale: ScaleId;
  iodateMm: number;
  temperatureC: number;
}

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
  start: Partial<ChapterControls>;
}

export const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  scale: 'beaker',
  iodateMm: IODATE_RANGE_MM.default,
  temperatureC: TEMPERATURE_RANGE_C.default,
};

const HALF_SPEED = REAL_TIME_SPEED - 1;

export const RUN_START = PHASE_RANGES.pour.start;
const SLOW_STEP_AT = 200;
const INVISIBLE_IODINE_AT = 360;
const TIPPING_POINT_AT = 440;
const STARCH_AT = PHASE_RANGES.complex.start;

const BEAKER: Partial<ChapterControls> = { scale: 'beaker' };
const MOLECULES: Partial<ChapterControls> = { scale: 'molecules' };

const SLOW_STEP_PARTS: readonly PartId[] = [
  'iodate',
  'bisulfite',
  'sulfate',
  'iodide',
  'hydrogenIon',
];

const INVISIBLE_IODINE_LABELS: readonly PartId[] = [
  'iodate',
  'iodide',
  'iodine',
  'bisulfite',
  'sulfate',
];

const STARCH_PARTS: readonly PartId[] = ['amylose', 'glucose', 'polyiodide', 'triiodide', 'iodine'];

export const PRESETS: Record<PresetId, Preset> = {
  pour: {
    camera: 'bench',
    speed: REAL_TIME_SPEED,
    startAt: RUN_START,
    start: BEAKER,
    labels: [
      'mixingBeaker',
      'mixture',
      'pourBeaker',
      'bisulfiteSolution',
      'pourStream',
      'stirBar',
      'stopwatch',
    ],
    highlight: [],
  },
  slowStep: {
    camera: 'landolt',
    speed: REAL_TIME_SPEED,
    startAt: SLOW_STEP_AT,
    start: MOLECULES,
    labels: SLOW_STEP_PARTS,
    highlight: SLOW_STEP_PARTS,
  },
  invisibleIodine: {
    camera: 'iodine',
    speed: REAL_TIME_SPEED,
    startAt: INVISIBLE_IODINE_AT,
    start: MOLECULES,
    labels: INVISIBLE_IODINE_LABELS,
    highlight: [...INVISIBLE_IODINE_LABELS, 'hydrogenIon'],
  },
  tippingPoint: {
    camera: 'beaker',
    speed: REAL_TIME_SPEED,
    startAt: TIPPING_POINT_AT,
    start: BEAKER,
    labels: ['mixture', 'stirBar', 'thermometer', 'stopwatch'],
    highlight: [],
  },
  starch: {
    camera: 'helix',
    speed: HALF_SPEED,
    startAt: STARCH_AT,
    start: MOLECULES,
    labels: STARCH_PARTS,
    highlight: STARCH_PARTS,
  },
  tuning: {
    camera: 'tuning',
    speed: REAL_TIME_SPEED,
    startAt: RUN_START,
    start: BEAKER,
    labels: ['mixture', 'thermometer', 'stopwatch', 'mixingBeaker'],
    highlight: [],
  },
};

export const SCALE_DEFAULT_LABELS: Readonly<Record<ScaleId, readonly PartId[]>> = {
  beaker: ['mixingBeaker', 'mixture', 'stirBar', 'stopwatch'],
  molecules: ['iodate', 'bisulfite', 'iodide', 'iodine', 'amylose'],
};
