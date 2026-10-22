import type { ScenePreset } from '@core/scene/presetBinder';
import type {
  BrakeModeId,
  CameraView,
  CompareId,
  NudgeId,
  PartId,
  PresetId,
  ViewOptions,
} from '../ids';
import { DEFAULT_SPEED, MOMENTS, PHASE_RANGES, SLOW_SPEED } from '../model';

export interface ChapterControls {
  brakeMode: BrakeModeId;
  nudge: NudgeId | null;
  compare: CompareId;
}

export interface Preset extends ScenePreset<PartId, CameraView> {
  view: Partial<ViewOptions>;
  start?: Partial<ChapterControls>;
}

type ChapterView = Omit<ViewOptions, 'labels'>;

const STOP_SPEED = 4;

const PLATFORM_START = PHASE_RANGES.liftOff.start;
const AFTER_DEPARTURE_UNITS = 10;
const JUST_DEPARTED = PHASE_RANGES.accelerate.start + AFTER_DEPARTURE_UNITS;
const LAST_BRAKING_UNITS = 60;
const LAST_OF_BRAKING = PHASE_RANGES.brake.end - LAST_BRAKING_UNITS;

const ALL_OFF: ChapterView = {
  wave: false,
  gap: false,
  ghost: false,
  cutaway: false,
  lineUp: false,
};

function chapterView(on: Partial<ChapterView>): ChapterView {
  return { ...ALL_OFF, ...on };
}

const LIFT_PARTS: readonly PartId[] = [
  'wrapArms',
  'supportMagnets',
  'statorPacks',
  'skids',
  'gapInset',
];

const GUIDANCE_PARTS: readonly PartId[] = [
  'guidanceMagnets',
  'guidanceRails',
  'supportMagnets',
  'statorPacks',
  'wrapArms',
];

const MOTOR_PARTS: readonly PartId[] = [
  'statorPacks',
  'travellingWave',
  'poweredSection',
  'supportMagnets',
  'feederCable',
  'gapInset',
];

const BRAKE_PARTS: readonly PartId[] = ['skids', 'eddyBrakes', 'powerFlow', 'feederCable'];

const LINE_UP_PARTS: readonly PartId[] = ['train', 'scmaglev', 'wheelRail', 'gapCallouts'];

export const PRESETS: Record<PresetId, Preset> = {
  ride: {
    camera: 'ride',
    speed: DEFAULT_SPEED,
    view: chapterView({ ghost: true }),
    startAt: PLATFORM_START,
    labels: ['train', 'guideway', 'piers', 'stations', 'ghostTrain'],
    highlight: [],
  },
  float: {
    camera: 'arm',
    speed: SLOW_SPEED,
    view: chapterView({ gap: true }),
    startAt: PLATFORM_START,
    labels: LIFT_PARTS,
    highlight: LIFT_PARTS,
  },
  centre: {
    camera: 'section',
    speed: DEFAULT_SPEED,
    view: chapterView({ cutaway: true }),
    pauseAt: MOMENTS.fullSpeed,
    start: { nudge: null },
    labels: [...GUIDANCE_PARTS, 'guideway'],
    highlight: GUIDANCE_PARTS,
  },
  motor: {
    camera: 'wave',
    speed: SLOW_SPEED,
    view: chapterView({ wave: true, gap: true }),
    startAt: JUST_DEPARTED,
    labels: MOTOR_PARTS,
    highlight: MOTOR_PARTS,
  },
  stop: {
    camera: 'rear',
    speed: STOP_SPEED,
    view: chapterView({ wave: true }),
    startAt: LAST_OF_BRAKING,
    start: { brakeMode: 'regen' },
    labels: [...BRAKE_PARTS, 'stations'],
    highlight: BRAKE_PARTS,
  },
  compare: {
    camera: 'lineUp',
    speed: DEFAULT_SPEED,
    view: chapterView({ cutaway: true, lineUp: true }),
    pauseAt: MOMENTS.fullSpeed,
    start: { compare: 'transrapid' },
    labels: LINE_UP_PARTS,
    highlight: LINE_UP_PARTS,
  },
};
