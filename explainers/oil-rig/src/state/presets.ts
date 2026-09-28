import type { ScenePreset } from '@core/scene/presetBinder';
import type { PartId, ViewOptions } from '../ids';
import { FINAL_DEPTH_M, RISER_LANDED_DEPTH_M, layerById } from '../model';

export type PresetId = 'overview' | 'float' | 'drill' | 'mud' | 'rock' | 'flow';

export type CameraView =
  'overview' | 'waterline' | 'drillFloor' | 'bit' | 'seabed' | 'trap' | 'completion' | 'well';

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
}

const MUD_CHAPTER_START_M = 2100;

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'overview',
    speed: 80,
    view: { cutaway: true, mud: true, flow: false },
    labels: [],
    highlight: [],
  },
  float: {
    camera: 'waterline',
    speed: 40,
    view: { flow: false },
    startAt: 0,
    labels: ['pontoon', 'column', 'thruster', 'mooring', 'derrick', 'helideck', 'moonpool'],
    highlight: ['pontoon', 'column'],
  },
  drill: {
    camera: 'bit',
    speed: 60,
    view: { cutaway: true, flow: false },
    startAt: RISER_LANDED_DEPTH_M,
    labels: ['topDrive', 'drillPipe', 'drillCollars', 'bit', 'surfaceCasing'],
    highlight: ['topDrive', 'drillPipe', 'bit'],
  },
  mud: {
    camera: 'seabed',
    speed: 40,
    view: { mud: true, flow: false },
    startAt: MUD_CHAPTER_START_M,
    labels: ['riser', 'bop', 'wellhead', 'annulus', 'drillPipe'],
    highlight: ['riser', 'bop', 'annulus'],
  },
  rock: {
    camera: 'trap',
    speed: 40,
    view: { cutaway: true, flow: false },
    startAt: layerById('seal').top,
    labels: ['seal', 'gasCap', 'oil', 'oilWaterContact', 'aquifer', 'sourceRock'],
    highlight: ['seal', 'gasCap', 'oil'],
  },
  flow: {
    camera: 'completion',
    speed: 40,
    view: { flow: true, mud: false },
    pauseAt: FINAL_DEPTH_M,
    labels: ['tubing', 'perforations', 'oil', 'flare', 'bop'],
    highlight: ['tubing', 'flare'],
  },
};
