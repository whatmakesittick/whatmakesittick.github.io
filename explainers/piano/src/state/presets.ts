import type { ScenePreset } from '@core/scene/presetBinder';
import type { CameraView, CompareId, PartId, PresetId, RegisterId, ViewOptions } from '../ids';
import { DEFAULT_SPEED, MOMENTS, PHASE_RANGES, SLOWEST_SPEED, SLOW_SPEED } from '../model';

export interface ChapterControls {
  register: RegisterId;
  compare: CompareId;
}

export type ChapterView = Omit<ViewOptions, 'labels' | 'sound' | 'follow'>;

export interface Preset extends ScenePreset<PartId, CameraView> {
  view: Partial<ViewOptions>;
  start?: Partial<ChapterControls>;
}

const KEY_AT_REST = PHASE_RANGES.press.start;
const BEFORE_JACK_TOUCH_UNITS = 50;
const LATE_IN_PRESS = PHASE_RANGES.press.end - BEFORE_JACK_TOUCH_UNITS;
const AFTER_LET_OFF_UNITS = 20;
const IN_FREE_FLIGHT = MOMENTS.letOff + AFTER_LET_OFF_UNITS;

const ALL_OFF: ChapterView = {
  wave: false,
  inset: false,
  ghost: false,
  cutaway: false,
  lineUp: false,
};

function chapterView(on: Partial<ChapterView>): ChapterView {
  return { ...ALL_OFF, ...on };
}

const MIDDLE_C: Partial<ChapterControls> = { register: 'middle' };

const LEVER_PARTS: readonly PartId[] = ['key', 'capstan', 'wippen', 'jack', 'knuckle', 'hammer'];

const ESCAPEMENT_PARTS: readonly PartId[] = [
  'jack',
  'knuckle',
  'letOffButton',
  'repetitionLever',
  'backCheck',
  'hammer',
  'inset',
];

const DAMPER_PARTS: readonly PartId[] = ['damper', 'strings', 'hammer'];

const ROOM_PARTS: readonly PartId[] = ['strings', 'bridge', 'soundboard', 'plate'];

const LINE_UP_PARTS: readonly PartId[] = ['hammer', 'jack', 'upright', 'harpsichord'];

export const PRESETS: Record<PresetId, Preset> = {
  key: {
    camera: 'grand',
    speed: DEFAULT_SPEED,
    view: chapterView({ cutaway: true }),
    startAt: KEY_AT_REST,
    start: MIDDLE_C,
    labels: ['key', 'hammer', 'damper', 'strings', 'soundboard', 'plate', 'case', 'pedals'],
    highlight: [],
  },
  lever: {
    camera: 'action',
    speed: SLOW_SPEED,
    view: chapterView({ cutaway: true }),
    startAt: KEY_AT_REST,
    start: MIDDLE_C,
    labels: [...LEVER_PARTS, 'strings'],
    highlight: LEVER_PARTS,
  },
  letGo: {
    camera: 'escapement',
    speed: SLOWEST_SPEED,
    view: chapterView({ cutaway: true, inset: true }),
    startAt: LATE_IN_PRESS,
    start: MIDDLE_C,
    labels: ESCAPEMENT_PARTS,
    highlight: ESCAPEMENT_PARTS,
  },
  dampers: {
    camera: 'dampers',
    speed: DEFAULT_SPEED,
    view: chapterView({ cutaway: true }),
    startAt: KEY_AT_REST,
    start: MIDDLE_C,
    labels: [...DAMPER_PARTS, 'actions'],
    highlight: DAMPER_PARTS,
  },
  room: {
    camera: 'soundboard',
    speed: DEFAULT_SPEED,
    view: chapterView({ cutaway: true, wave: true }),
    startAt: IN_FREE_FLIGHT,
    start: MIDDLE_C,
    labels: [...ROOM_PARTS, 'bassStrings', 'tuningPins'],
    highlight: ROOM_PARTS,
  },
  compare: {
    camera: 'lineUp',
    speed: SLOW_SPEED,
    view: chapterView({ cutaway: true, lineUp: true }),
    startAt: KEY_AT_REST,
    start: { compare: 'grand' },
    labels: LINE_UP_PARTS,
    highlight: ['key', ...LINE_UP_PARTS],
  },
};
