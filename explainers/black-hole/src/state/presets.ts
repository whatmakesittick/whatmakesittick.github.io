import type { ScenePreset } from '@core/scene/presetBinder';
import type { BlackHoleId, PartId, ViewOptions } from '../ids';
import { HORIZON_TIME, LAST_STABLE_ORBIT_RADIUS, tauAtRadius } from '../model';

export type PresetId = 'overview' | 'clocks' | 'light' | 'frozen' | 'inside' | 'others';

export type CameraView = 'hero' | 'probe' | 'lens' | 'ship' | 'sheet';

export type ChapterControl = 'comparison';

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
  controls?: readonly ChapterControl[];
}

export const DEFAULT_COMPARISON: BlackHoleId = 'sgrA';

const RELEASE = 0;
const FROZEN_RADIUS = 2;
const INSIDE_LEAD_SECONDS = 8;

const DISC_VIEW = { disc: true, sheet: false } as const;
const SHEET_VIEW = { disc: false, sheet: true } as const;

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'hero',
    speed: 3,
    view: DISC_VIEW,
    startAt: RELEASE,
    labels: ['horizon', 'disc', 'probe', 'ship'],
    highlight: [],
  },
  clocks: {
    camera: 'probe',
    speed: 3,
    view: DISC_VIEW,
    startAt: RELEASE,
    labels: ['probe', 'ship', 'beacon'],
    highlight: ['probe', 'ship', 'beacon'],
  },
  light: {
    camera: 'lens',
    speed: 3,
    view: DISC_VIEW,
    startAt: tauAtRadius(LAST_STABLE_ORBIT_RADIUS),
    labels: ['horizon', 'photonSphere', 'disc'],
    highlight: [],
  },
  frozen: {
    camera: 'ship',
    speed: 1,
    view: DISC_VIEW,
    startAt: tauAtRadius(FROZEN_RADIUS),
    labels: ['probe', 'horizon'],
    highlight: ['probe', 'beacon'],
  },
  inside: {
    camera: 'probe',
    speed: 0,
    view: DISC_VIEW,
    startAt: HORIZON_TIME - INSIDE_LEAD_SECONDS,
    labels: ['horizon', 'probe'],
    highlight: ['probe'],
  },
  others: {
    camera: 'sheet',
    speed: 3,
    view: SHEET_VIEW,
    startAt: RELEASE,
    controls: ['comparison'],
    labels: ['sheetProbe', 'horizon'],
    highlight: [],
  },
};
