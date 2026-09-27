import type { Preset as PlaybackPreset } from '@core/explainer';
import { HOOK } from '../model';

export type PresetId = 'overview' | 'needle' | 'bobbin' | 'tension' | 'feed';

export type CameraView = 'overview' | 'needle' | 'bobbin' | 'thread' | 'feed';

export type PartId =
  | 'needle'
  | 'needleBar'
  | 'presserFoot'
  | 'throatPlate'
  | 'feedDogs'
  | 'hook'
  | 'bobbinCase'
  | 'bobbin'
  | 'takeUpLever'
  | 'tensionDiscs'
  | 'spool'
  | 'handwheel'
  | 'fabric'
  | 'topThread'
  | 'bobbinThread';

export type ViewOptions = {
  labels: boolean;
  cutaway: boolean;
};

export interface Preset extends PlaybackPreset {
  camera: CameraView;
  labels: readonly PartId[];
  highlight: readonly PartId[];
  view?: Partial<ViewOptions>;
}

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'overview',
    speed: 20,
    view: { cutaway: false },
    labels: [],
    highlight: [],
  },
  needle: {
    camera: 'needle',
    speed: 10,
    view: { cutaway: true },
    pauseAt: HOOK.catchAngle,
    labels: ['needle', 'hook', 'topThread'],
    highlight: ['needle', 'hook'],
  },
  bobbin: {
    camera: 'bobbin',
    speed: 10,
    view: { cutaway: true },
    labels: ['hook', 'bobbinCase', 'bobbin', 'bobbinThread'],
    highlight: ['hook', 'bobbinCase', 'bobbin'],
  },
  tension: {
    camera: 'thread',
    speed: 20,
    view: { cutaway: true },
    labels: ['takeUpLever', 'tensionDiscs', 'fabric'],
    highlight: ['takeUpLever', 'tensionDiscs', 'fabric'],
  },
  feed: {
    camera: 'feed',
    speed: 20,
    view: { cutaway: false },
    labels: ['feedDogs', 'presserFoot', 'throatPlate'],
    highlight: ['feedDogs', 'presserFoot'],
  },
};
