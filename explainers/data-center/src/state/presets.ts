import type { ScenePreset } from '@core/scene/presetBinder';
import type { BenchmarkId, CameraView, DistanceId, PartId, PresetId, ViewOptions } from '../ids';
import { DEFAULT_SPEED, MOMENTS, PHASE_RANGES, SLOW_SPEED } from '../model';

export interface ChapterControls {
  benchmark: BenchmarkId;
  distance: DistanceId;
}

export interface Preset extends ScenePreset<PartId, CameraView> {
  view: Partial<ViewOptions>;
  start?: Partial<ChapterControls>;
}

type ChapterView = Omit<ViewOptions, 'labels' | 'follow'>;

const RUN_START = PHASE_RANGES.grid.start;
const TAP_DROP_UNITS = 30;
const ABOVE_THE_RACK = MOMENTS.atRack - TAP_DROP_UNITS;

const ALL_OFF: ChapterView = {
  power: false,
  heat: false,
  packets: false,
  cutaway: false,
  inset: false,
  lineUp: false,
};

function chapterView(on: Partial<ChapterView>): ChapterView {
  return { ...ALL_OFF, ...on };
}

const POWER_PARTS: readonly PartId[] = [
  'gridLine',
  'transformers',
  'switchgear',
  'ups',
  'batteries',
  'generators',
  'busway',
  'joule',
];

const RACK_PARTS: readonly PartId[] = [
  'subjectRack',
  'powerShelves',
  'busbar',
  'computeTrays',
  'switchTrays',
  'trayFans',
  'chipInset',
];

const NETWORK_PARTS: readonly PartId[] = [
  'fibreEntry',
  'spineSwitches',
  'leafSwitches',
  'switchTrays',
];

const HEAT_PARTS: readonly PartId[] = [
  'manifold',
  'cdu',
  'facilityPipes',
  'chiller',
  'dryCoolers',
  'airHandlers',
];

const LINE_UP_PARTS: readonly PartId[] = ['subjectRack', 'laptop', 'racks'];

export const PRESETS: Record<PresetId, Preset> = {
  building: {
    camera: 'campus',
    speed: DEFAULT_SPEED,
    view: chapterView({ power: true, heat: true, inset: true }),
    startAt: RUN_START,
    labels: [
      'gridLine',
      'substation',
      'generators',
      'hall',
      'racks',
      'chiller',
      'dryCoolers',
      'joule',
    ],
    highlight: [],
  },
  powerIn: {
    camera: 'powerYard',
    speed: SLOW_SPEED,
    view: chapterView({ power: true, cutaway: true }),
    startAt: RUN_START,
    labels: POWER_PARTS,
    highlight: POWER_PARTS,
  },
  rack: {
    camera: 'rackSide',
    speed: SLOW_SPEED,
    view: chapterView({ power: true, cutaway: true, inset: true }),
    startAt: ABOVE_THE_RACK,
    labels: [...RACK_PARTS, 'joule'],
    highlight: RACK_PARTS,
  },
  network: {
    camera: 'networkRow',
    speed: DEFAULT_SPEED,
    view: chapterView({ packets: true, cutaway: true }),
    pauseAt: MOMENTS.atRack,
    start: { distance: 'km1000' },
    labels: [...NETWORK_PARTS, 'subjectRack'],
    highlight: NETWORK_PARTS,
  },
  heatOut: {
    camera: 'coolingPlant',
    speed: SLOW_SPEED,
    view: chapterView({ heat: true, cutaway: true }),
    startAt: MOMENTS.inCoolant,
    labels: [...HEAT_PARTS, 'joule'],
    highlight: HEAT_PARTS,
  },
  compare: {
    camera: 'lineUp',
    speed: DEFAULT_SPEED,
    view: chapterView({ heat: true, lineUp: true, cutaway: true }),
    pauseAt: MOMENTS.inCoolant,
    start: { benchmark: 'average' },
    labels: [...LINE_UP_PARTS, 'chipInset'],
    highlight: LINE_UP_PARTS,
  },
};
