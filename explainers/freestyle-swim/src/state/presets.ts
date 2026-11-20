import type { ScenePreset } from '@core/scene/presetBinder';
import type { BreathId, CameraView, KickId, PartId, PaceId, PresetId, ViewOptions } from '../ids';
import { DEFAULT_PACE, MOMENTS, WHAT_IF_RANGE, phaseBounds } from '../model';
import { SCRUBBER_STEP_UNITS } from '../timeline';

export interface ChapterControls {
  kickOverride: KickId | null;
  breathing: BreathId;
  headUp: boolean;
  whatIfSpeed: number;
}

export interface Preset extends ScenePreset<PartId, CameraView> {
  view: Partial<ViewOptions>;
  start: Partial<ChapterControls>;
  pauseFor?(pace: PaceId): number;
}

export function catchPauseUnits(pace: PaceId): number {
  const [catchUnits] = phaseBounds(pace).pull;
  return Math.ceil(catchUnits / SCRUBBER_STEP_UNITS) * SCRUBBER_STEP_UNITS;
}

export const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  kickOverride: null,
  breathing: 'none',
  headUp: false,
  whatIfSpeed: WHAT_IF_RANGE.default,
};

const SLOW_SPEED = 1;
const HALF_SPEED = 2;

const NO_HIGHLIGHT: readonly PartId[] = [];

function view(flags: Partial<ViewOptions>): Partial<ViewOptions> {
  return { labels: true, ...flags };
}

export const PRESETS: Record<PresetId, Preset> = {
  stroke: {
    camera: 'whole',
    speed: HALF_SPEED,
    view: view({ underwater: true, forces: false, handPath: false }),
    startAt: MOMENTS.entry,
    start: {},
    labels: ['hand', 'forearm', 'shoulder', 'head', 'hips', 'foot', 'waterline', 'laneLine'],
    highlight: NO_HIGHLIGHT,
  },
  catch: {
    camera: 'catch',
    speed: SLOW_SPEED,
    view: view({ underwater: true, forces: false, handPath: false }),
    pauseAt: catchPauseUnits(DEFAULT_PACE),
    pauseFor: catchPauseUnits,
    start: {},
    labels: ['hand', 'forearm', 'elbow', 'shoulder', 'waterline'],
    highlight: ['hand', 'forearm', 'elbow'],
  },
  pull: {
    camera: 'pull',
    speed: SLOW_SPEED,
    view: view({ underwater: true, forces: true, handPath: true }),
    startAt: MOMENTS.catch,
    start: {},
    labels: ['hand', 'forearm', 'elbow', 'shoulder', 'waterline'],
    highlight: ['hand', 'forearm'],
  },
  roll: {
    camera: 'roll',
    speed: HALF_SPEED,
    view: view({ underwater: false, forces: false, handPath: false }),
    startAt: MOMENTS.entry,
    start: {},
    labels: ['shoulder', 'hips', 'head', 'waterline'],
    highlight: ['shoulder', 'hips'],
  },
  kick: {
    camera: 'kick',
    speed: HALF_SPEED,
    view: view({ underwater: true, forces: false, handPath: false }),
    startAt: MOMENTS.entry,
    start: {},
    labels: ['hips', 'foot', 'waterline'],
    highlight: ['hips', 'foot'],
  },
  drag: {
    camera: 'drag',
    speed: HALF_SPEED,
    view: view({ underwater: true, forces: true, handPath: false }),
    startAt: MOMENTS.entry,
    start: {},
    labels: ['head', 'hips', 'waterline', 'laneRope'],
    highlight: ['head', 'hips'],
  },
};
