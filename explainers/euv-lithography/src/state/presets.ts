import type { ScenePreset } from '@core/scene/presetBinder';
import type { CameraView, PartId, PresetId, ViewOptions } from '../ids';
import { DEFAULT_SPEED, MOMENTS } from '../model';

export type ChapterControls = Record<string, never>;

export interface Preset extends ScenePreset<PartId, CameraView> {
  view: Partial<ViewOptions>;
}

const SLOW_SPEED = 1;
const MIRRORS_PAUSE = MOMENTS.atFocus;
const COMPARE_PAUSE = MOMENTS.onWafer;
const MASK_START = 600;

type ChapterView = Pick<ViewOptions, 'beam' | 'cutaway' | 'inset'>;

function chapterView(cutaway: boolean, inset: boolean): ChapterView {
  return { beam: true, cutaway, inset };
}

export const PRESETS: Record<PresetId, Preset> = {
  machine: {
    camera: 'overview',
    speed: DEFAULT_SPEED,
    view: chapterView(true, false),
    startAt: 0,
    labels: ['driveLaser', 'beamTransport', 'vessel', 'illuminator', 'mask', 'projection', 'wafer'],
    highlight: [],
  },
  light: {
    camera: 'source',
    speed: SLOW_SPEED,
    view: chapterView(true, true),
    startAt: 0,
    labels: ['droplets', 'collector', 'plasma', 'dropletInset', 'hair', 'flash'],
    highlight: ['droplets', 'collector', 'plasma', 'dropletInset'],
  },
  mirrors: {
    camera: 'lightPath',
    speed: DEFAULT_SPEED,
    view: chapterView(true, false),
    pauseAt: MIRRORS_PAUSE,
    labels: ['collector', 'intermediateFocus', 'illuminator', 'mask', 'projection', 'flash'],
    highlight: ['collector', 'illuminator', 'projection'],
  },
  mask: {
    camera: 'maskStage',
    speed: SLOW_SPEED,
    view: chapterView(true, false),
    startAt: MASK_START,
    labels: ['illuminator', 'mask', 'pellicle', 'maskStage', 'flash'],
    highlight: ['mask', 'pellicle', 'maskStage'],
  },
  scan: {
    camera: 'waferStage',
    speed: SLOW_SPEED,
    view: chapterView(true, false),
    startAt: MOMENTS.onMask,
    labels: ['projection', 'wafer', 'waferStage', 'maskStage', 'flash'],
    highlight: ['waferStage', 'maskStage', 'wafer'],
  },
  compare: {
    camera: 'optics',
    speed: DEFAULT_SPEED,
    view: chapterView(false, true),
    pauseAt: COMPARE_PAUSE,
    labels: ['projection', 'wafer', 'patternInset', 'virus', 'flash'],
    highlight: ['projection', 'patternInset', 'virus'],
  },
};
