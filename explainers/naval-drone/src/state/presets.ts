import type { ScenePreset } from '@core/scene/presetBinder';
import type {
  CameraView,
  FitId,
  HelmId,
  LinkMode,
  PartId,
  PresetId,
  SeaStateId,
  ViewOptions,
} from '../ids';
import { HELD_PHASE } from '../model';

export interface ChapterControls {
  trialKnots: number | null;
  helm: HelmId;
  linkMode: LinkMode;
  videoDelayMs: number;
  radarHeight: number;
  seaState: SeaStateId;
}

export type ChapterControl = keyof ChapterControls;

export interface Preset extends ScenePreset<PartId, CameraView> {
  view: Partial<ViewOptions>;
  controls?: readonly ChapterControl[];
  start?: Partial<ChapterControls>;
}

export const DEFAULT_FIT: FitId = 'standard';

const NORMAL_SPEED = 1;
const HULL_TRIAL_KNOTS = 11;
const JET_TRIAL_KNOTS = 22;

const CHAPTER_START_SECONDS = {
  overview: 0,
  link: 52,
  horizon: 62,
  fleet: 96,
} as const;

const HULL_PARTS: readonly PartId[] = [
  'hull',
  'chines',
  'sprayRails',
  'bowWave',
  'spray',
  'wake',
  'wettedLength',
];

const JET_PARTS: readonly PartId[] = [
  'intake',
  'duct',
  'driveShaft',
  'impeller',
  'stator',
  'nozzle',
  'steeringNozzle',
  'reverseBucket',
  'jetStream',
];

const LINK_PARTS: readonly PartId[] = [
  'starlinkPanels',
  'backupPanel',
  'satLink',
  'backupLink',
  'satellite',
  'backupSatellite',
  'groundStation',
  'videoGhost',
];

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'chase',
    speed: NORMAL_SPEED,
    view: { cutaway: true, flow: false, links: false },
    startAt: CHAPTER_START_SECONDS.overview,
    labels: [
      'hull',
      'payloadBay',
      'fuelTanks',
      'engine',
      'electronicsBay',
      'waterjet',
      'starlinkPanels',
      'cameraDome',
      'bowCamera',
    ],
    highlight: [],
  },
  hull: {
    camera: 'waterline',
    speed: NORMAL_SPEED,
    view: { cutaway: false, flow: true, links: false },
    pauseAt: HELD_PHASE,
    controls: ['trialKnots'],
    start: { trialKnots: HULL_TRIAL_KNOTS },
    labels: HULL_PARTS,
    highlight: HULL_PARTS,
  },
  jet: {
    camera: 'stern',
    speed: NORMAL_SPEED,
    view: { cutaway: true, flow: true, links: false },
    pauseAt: HELD_PHASE,
    controls: ['trialKnots', 'helm'],
    start: { trialKnots: JET_TRIAL_KNOTS, helm: 'straight' },
    labels: JET_PARTS,
    highlight: [...JET_PARTS, 'waterjet', 'engine'],
  },
  link: {
    camera: 'sky',
    speed: NORMAL_SPEED,
    view: { cutaway: false, flow: false, links: true },
    startAt: CHAPTER_START_SECONDS.link,
    controls: ['linkMode', 'videoDelayMs'],
    labels: LINK_PARTS,
    highlight: LINK_PARTS,
  },
  horizon: {
    camera: 'eye',
    speed: NORMAL_SPEED,
    view: { cutaway: false, flow: false, links: false },
    startAt: CHAPTER_START_SECONDS.horizon,
    controls: ['radarHeight', 'seaState'],
    start: { seaState: 'slight' },
    labels: ['ship', 'shipRadar', 'bowCamera', 'wake'],
    highlight: ['cameraDome', 'bowCamera', 'ship', 'shipRadar'],
  },
  fleet: {
    camera: 'group',
    speed: NORMAL_SPEED,
    view: { cutaway: false, flow: false, links: false },
    startAt: CHAPTER_START_SECONDS.fleet,
    labels: ['companions', 'ship', 'missileRails', 'starlinkPanels'],
    highlight: [],
  },
};
