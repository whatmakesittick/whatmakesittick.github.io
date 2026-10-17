import type { ScenePreset } from '@core/scene/presetBinder';
import type { CameraView, PartId, PresetId, ViewOptions } from '../ids';
import { MOMENTS, SPEED_RANGE } from '../model';

export interface Preset extends ScenePreset<PartId, CameraView> {
  view: Partial<ViewOptions>;
}

const REAL_TIME = SPEED_RANGE.default;
const HALF_SPEED = 0.5;

const STANDING_START_S = 0;
const NOZZLES_FIRING_S = 1;
const BEFORE_RAMP_S = 2;

const NOZZLE_PARTS: readonly PartId[] = ['rearNozzles', 'cornerNozzles', 'frontNozzles', 'jets'];

export const PRESETS: Record<PresetId, Preset> = {
  tank: {
    camera: 'tankClose',
    speed: REAL_TIME,
    view: { tank: true, nozzles: false, forces: false, ghost: false },
    pauseAt: STANDING_START_S,
    labels: ['tank', 'tankValve', 'seat', 'cornerNozzles', 'rearNozzles'],
    highlight: ['tank', 'tankValve', 'seat'],
  },
  nozzle: {
    camera: 'nozzleClose',
    speed: HALF_SPEED,
    view: { nozzles: true, forces: true, tank: false, ghost: false },
    pauseAt: NOZZLES_FIRING_S,
    labels: NOZZLE_PARTS,
    highlight: NOZZLE_PARTS,
  },
  boost: {
    camera: 'boostSide',
    speed: REAL_TIME,
    view: { nozzles: true, forces: true, tank: false, ghost: false },
    startAt: STANDING_START_S,
    labels: ['rearNozzles', 'jets', 'wheels', 'runway'],
    highlight: ['rearNozzles', 'jets', 'wheels'],
  },
  hop: {
    camera: 'rampWide',
    speed: REAL_TIME,
    view: { nozzles: false, forces: false, tank: false, ghost: true },
    startAt: BEFORE_RAMP_S,
    labels: ['ramp', 'fans', 'ghostPath', 'landingPad'],
    highlight: ['ramp', 'fans', 'ghostPath', 'body'],
  },
  flip: {
    camera: 'flipChase',
    speed: HALF_SPEED,
    view: { nozzles: true, forces: true, tank: false, ghost: true },
    startAt: MOMENTS.leavesRamp,
    labels: ['cornerNozzles', 'jets', 'forceArrows', 'landingPad'],
    highlight: ['cornerNozzles', 'jets', 'forceArrows', 'body'],
  },
  limits: {
    camera: 'siteWide',
    speed: REAL_TIME,
    view: { nozzles: false, forces: false, tank: true, ghost: true },
    startAt: STANDING_START_S,
    labels: ['tank', 'ghostPath', 'ramp', 'landingPad'],
    highlight: [],
  },
};
