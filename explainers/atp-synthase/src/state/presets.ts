import type { ScenePreset } from '@core/scene/presetBinder';
import type { PartId, ViewOptions } from '../ids';

export type PresetId = 'overview' | 'gradient' | 'rotor' | 'head' | 'sprint' | 'training';

export type CameraView = 'motor' | 'pumps' | 'ring' | 'head' | 'row';

export type ChapterControl = 'ring' | 'oxygen' | 'event' | 'training';

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
  controls?: readonly ChapterControl[];
}

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'motor',
    speed: 2,
    view: { membrane: true, cutaway: false, flow: true },
    labels: ['cRing', 'centralStalk', 'betaSubunits', 'peripheralStalk', 'membrane'],
    highlight: [],
  },
  gradient: {
    camera: 'pumps',
    speed: 3,
    view: { membrane: true, cutaway: false, flow: true },
    controls: ['oxygen'],
    labels: ['pumps', 'electrons', 'oxygen', 'protons', 'matrix', 'intermembraneSpace'],
    highlight: ['pumps', 'electrons', 'oxygen', 'protons', 'membrane'],
  },
  rotor: {
    camera: 'ring',
    speed: 1,
    view: { membrane: false, cutaway: false, flow: true },
    controls: ['ring'],
    labels: ['cRing', 'subunitA', 'protons', 'matrix', 'intermembraneSpace'],
    highlight: ['cRing', 'subunitA', 'protons'],
  },
  head: {
    camera: 'head',
    speed: 0,
    view: { membrane: true, cutaway: true, flow: true },
    labels: ['openSite', 'looseSite', 'tightSite', 'atp', 'adpPhosphate', 'centralStalk'],
    highlight: [
      'alphaSubunits',
      'betaSubunits',
      'centralStalk',
      'openSite',
      'looseSite',
      'tightSite',
      'atp',
      'adpPhosphate',
      'peripheralStalk',
    ],
  },
  sprint: {
    camera: 'motor',
    speed: 10,
    view: { membrane: true, cutaway: false, flow: true },
    controls: ['event'],
    labels: ['atp', 'protons', 'cRing'],
    highlight: [],
  },
  training: {
    camera: 'row',
    speed: 4,
    view: { membrane: true, cutaway: false, flow: false },
    controls: ['training'],
    labels: ['neighbourMotors', 'membrane'],
    highlight: [
      'neighbourMotors',
      'membrane',
      'cRing',
      'centralStalk',
      'betaSubunits',
      'alphaSubunits',
      'peripheralStalk',
    ],
  },
};
