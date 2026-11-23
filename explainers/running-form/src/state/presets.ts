import type { ScenePreset } from '@core/scene/presetBinder';
import type { ArmsId, CameraView, LookId, PartId, PresetId, ViewOptions } from '../ids';
import { MOMENTS, STEP_RATE_RANGE } from '../model';

export interface ChapterControls {
  stepRate: number;
  arms: ArmsId;
  lookFrom: LookId;
}

export interface Preset extends ScenePreset<PartId, CameraView> {
  view: ViewOptions;
  start: Partial<ChapterControls>;
}

export const RUN_CONTROL_DEFAULTS: ChapterControls = {
  stepRate: STEP_RATE_RANGE.default,
  arms: 'swing',
  lookFrom: 'front',
};

const SLOW_SPEED = 1;
const HALF_SPEED = 2;

const SPRING_START_UNITS = 120;
const LIFTOFF_START_UNITS = 300;
const POSTURE_START_UNITS = 180;
const PACE_START_UNITS = 640;

const NO_HIGHLIGHT: readonly PartId[] = [];

function view(flags: Partial<ViewOptions>): ViewOptions {
  return { labels: true, forces: false, formLines: false, footPath: false, follow: true, ...flags };
}

export const PRESETS: Record<PresetId, Preset> = {
  stride: {
    camera: 'hero',
    speed: HALF_SPEED,
    view: view({}),
    startAt: MOMENTS.midFloat,
    start: {},
    labels: ['head', 'trunk', 'pelvis', 'thigh', 'knee', 'shoe', 'road'],
    highlight: NO_HIGHLIGHT,
  },
  touchdown: {
    camera: 'foot',
    speed: SLOW_SPEED,
    view: view({ forces: true, formLines: true }),
    pauseAt: MOMENTS.touchdown,
    start: {},
    labels: ['heel', 'shin', 'knee', 'shoe', 'road'],
    highlight: ['shin', 'shoe'],
  },
  spring: {
    camera: 'leg',
    speed: SLOW_SPEED,
    view: view({ forces: true }),
    startAt: SPRING_START_UNITS,
    start: {},
    labels: ['knee', 'achilles', 'arch', 'thigh', 'shin'],
    highlight: ['thigh', 'shin', 'achilles', 'arch'],
  },
  liftoff: {
    camera: 'behind',
    speed: SLOW_SPEED,
    view: view({ footPath: true, follow: false }),
    startAt: LIFTOFF_START_UNITS,
    start: {},
    labels: ['hip', 'pelvis', 'thigh', 'shin', 'heel'],
    highlight: ['pelvis', 'thigh'],
  },
  posture: {
    camera: 'front',
    speed: HALF_SPEED,
    view: view({ formLines: true }),
    startAt: POSTURE_START_UNITS,
    start: {},
    labels: ['head', 'shoulder', 'elbow', 'arm', 'trunk', 'pelvis'],
    highlight: ['trunk', 'arm', 'pelvis'],
  },
  pace: {
    camera: 'wide',
    speed: HALF_SPEED,
    view: view({}),
    startAt: PACE_START_UNITS,
    start: {},
    labels: ['head', 'trunk', 'thigh', 'knee', 'shoe', 'road'],
    highlight: NO_HIGHLIGHT,
  },
};
