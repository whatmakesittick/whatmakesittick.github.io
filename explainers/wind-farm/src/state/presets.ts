import type { ScenePreset } from '@core/scene/presetBinder';
import type { CameraView, PartId, PresetId, SpacingD, ViewOptions } from '../ids';
import { DEFAULT_SPACING_D, DEFAULT_SPEED } from '../model';

export interface ChapterControls {
  spacing: SpacingD;
  windOverride: number | null;
}

export interface Preset extends ScenePreset<PartId, CameraView> {
  view: Partial<ViewOptions>;
  start?: Partial<ChapterControls>;
}

const NOON = 720;
const EARLY_AFTERNOON = 780;
const DAWN = 360;
const MID_MORNING = 540;

const FOLLOW_THE_DAY: Partial<ChapterControls> = { windOverride: null };
const DEFAULT_FARM: Partial<ChapterControls> = { spacing: DEFAULT_SPACING_D, windOverride: null };

const NACELLE_INTERIOR: readonly PartId[] = [
  'hub',
  'pitchCylinders',
  'mainBearing',
  'mainShaft',
  'gearbox',
  'brakeDisc',
  'generator',
  'converter',
  'yawDrives',
  'cooler',
];

export const PRESETS: Record<PresetId, Preset> = {
  farm: {
    camera: 'farmAerial',
    speed: DEFAULT_SPEED,
    view: { cutaway: false, streamlines: false, wakes: false, cables: false },
    startAt: NOON,
    start: DEFAULT_FARM,
    labels: ['farmTurbines', 'prevailingWind', 'spacingMarker', 'accessRoads', 'substation'],
    highlight: [],
  },
  tower: {
    camera: 'turbineTall',
    speed: DEFAULT_SPEED,
    view: { cutaway: false, streamlines: true, wakes: false, cables: false },
    startAt: NOON,
    start: FOLLOW_THE_DAY,
    labels: ['blades', 'hub', 'nacelle', 'tower', 'foundation', 'sweptArea', 'transformer'],
    highlight: ['blades', 'hub', 'sweptArea'],
  },
  nacelle: {
    camera: 'nacelleCutaway',
    speed: DEFAULT_SPEED,
    view: { cutaway: true, streamlines: false, wakes: false, cables: false },
    startAt: EARLY_AFTERNOON,
    start: FOLLOW_THE_DAY,
    labels: NACELLE_INTERIOR,
    highlight: [...NACELLE_INTERIOR, 'bedplate'],
  },
  curve: {
    camera: 'rotorQuarter',
    speed: DEFAULT_SPEED,
    view: { cutaway: false, streamlines: true, wakes: true, cables: false },
    startAt: DAWN,
    start: FOLLOW_THE_DAY,
    labels: ['blades', 'hub', 'nacelle', 'streamlinesGroup', 'heroWake'],
    highlight: ['blades', 'hub', 'streamlinesGroup', 'heroWake'],
  },
  wakes: {
    camera: 'wakeStreaks',
    speed: DEFAULT_SPEED,
    view: { cutaway: false, streamlines: true, wakes: true, cables: false },
    pauseAt: MID_MORNING,
    start: DEFAULT_FARM,
    labels: ['wakePlumes', 'farmTurbines', 'spacingMarker', 'prevailingWind', 'shearProfile'],
    highlight: ['wakePlumes', 'spacingMarker', 'shearProfile'],
  },
  grid: {
    camera: 'gridSubstation',
    speed: DEFAULT_SPEED,
    view: { cutaway: false, streamlines: false, wakes: false, cables: true },
    startAt: NOON,
    start: DEFAULT_FARM,
    labels: ['collectorCables', 'substation', 'gridLine', 'farmTurbines', 'accessRoads'],
    highlight: ['collectorCables', 'substation', 'gridLine'],
  },
};
