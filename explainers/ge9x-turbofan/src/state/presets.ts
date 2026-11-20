import type { ScenePreset } from '@core/scene/presetBinder';
import type { CameraView, CutawayId, PartId, PresetId, StreamId, ViewOptions } from '../ids';
import { MOMENTS, SPEED_RANGE } from '../model';

export interface ChapterControls {
  cutaway: CutawayId;
  streams: StreamId;
}

export interface Preset extends ScenePreset<PartId, CameraView> {
  view: Pick<ViewOptions, 'reverser'>;
  start: Partial<ChapterControls> & { thrust?: number };
}

export const CHAPTER_CONTROL_DEFAULTS: ChapterControls = { cutaway: 'closed', streams: 'both' };

const PACE = SPEED_RANGE.default;
const STOWED = { reverser: false } as const;
const CUTAWAY_HOT = { cutaway: 'cutaway', streams: 'hot' } as const;
const CRUISE_LEVER = 0.85;
const REVERSE_LEVER = 0.4;

export const PRESETS: Record<PresetId, Preset> = {
  fan: {
    camera: 'hero',
    speed: PACE,
    view: STOWED,
    startAt: MOMENTS.intake,
    start: { cutaway: 'closed', streams: 'both' },
    labels: ['fanBlades', 'nacelle', 'person', 'intakeLip', 'splitter'],
    highlight: [],
  },
  compressor: {
    camera: 'compressor',
    speed: PACE,
    view: STOWED,
    startAt: MOMENTS.behindFan,
    start: CUTAWAY_HOT,
    labels: ['booster', 'compressorRotor', 'compressorStator', 'outerShaft'],
    highlight: ['booster', 'compressor', 'outerShaft'],
  },
  combustor: {
    camera: 'combustor',
    speed: PACE,
    view: STOWED,
    startAt: MOMENTS.compressorExit,
    start: CUTAWAY_HOT,
    labels: ['fuelNozzles', 'combustorLiner', 'diffuser'],
    highlight: ['combustor'],
  },
  turbines: {
    camera: 'turbines',
    speed: PACE,
    view: STOWED,
    startAt: MOMENTS.combustorExit,
    start: CUTAWAY_HOT,
    labels: ['hpTurbine', 'lpTurbine', 'outerShaft', 'innerShaft'],
    highlight: ['hpTurbine', 'lpTurbine', 'outerShaft', 'innerShaft'],
  },
  thrust: {
    camera: 'side',
    speed: PACE,
    view: STOWED,
    startAt: MOMENTS.turbinesExit,
    start: { cutaway: 'cutaway', streams: 'both', thrust: CRUISE_LEVER },
    labels: ['coldStream', 'hotStream', 'coldNozzle', 'hotNozzle', 'fanBlades'],
    highlight: [],
  },
  reverse: {
    camera: 'rear',
    speed: PACE,
    view: { reverser: true },
    startAt: MOMENTS.intake,
    start: { cutaway: 'closed', streams: 'both', thrust: REVERSE_LEVER },
    labels: ['reverser', 'cascades', 'coldNozzle', 'person'],
    highlight: ['reverser', 'cascades', 'nacelle'],
  },
};
