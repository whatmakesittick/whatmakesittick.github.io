import type { ScenePreset } from '@core/scene/presetBinder';
import type {
  CameraView,
  ComparisonId,
  LoadId,
  PartId,
  PresetId,
  SensorModeId,
  ViewOptions,
} from '../ids';

export type ChapterControl = 'comparison' | 'sensorMode' | 'targetRange' | 'areaDistance';

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
  controls?: readonly ChapterControl[];
  load?: LoadId;
}

export const DEFAULT_LOAD: LoadId = 'armed';
export const DEFAULT_COMPARISON: ComparisonId = 'predator';
export const DEFAULT_SENSOR_MODE: SensorModeId = 'day';

const CHAPTER_START_UNITS: Readonly<Record<PresetId, number>> = {
  overview: 0,
  flight: 12,
  link: 23,
  sensor: 44,
  strike: 61.5,
  endurance: 46,
};

const NORMAL_SPEED = 1;
const ENDURANCE_SPEED = 2;

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'chase',
    speed: NORMAL_SPEED,
    view: { cutaway: false, links: true, track: true },
    startAt: CHAPTER_START_UNITS.overview,
    labels: [
      'fuselage',
      'wing',
      'vTail',
      'propeller',
      'sensorBall',
      'noseHump',
      'hellfire',
      'bombs',
    ],
    highlight: [],
  },
  flight: {
    camera: 'side',
    speed: NORMAL_SPEED,
    view: { cutaway: true },
    startAt: CHAPTER_START_UNITS.flight,
    controls: ['comparison'],
    labels: ['wing', 'engine', 'propeller', 'fuelTank', 'vTail', 'ventralFin', 'landingGear'],
    highlight: ['wing', 'engine', 'propeller', 'fuelTank'],
  },
  link: {
    camera: 'wide',
    speed: NORMAL_SPEED,
    view: { cutaway: true, links: true },
    startAt: CHAPTER_START_UNITS.link,
    labels: [
      'noseHump',
      'satelliteDish',
      'satLink',
      'losLink',
      'losAntenna',
      'groundStation',
      'satellite',
    ],
    highlight: ['satelliteDish', 'satLink', 'losLink', 'satellite', 'losAntenna'],
  },
  sensor: {
    camera: 'nose',
    speed: NORMAL_SPEED,
    view: { cutaway: false },
    startAt: CHAPTER_START_UNITS.sensor,
    controls: ['sensorMode'],
    labels: ['sensorBall', 'sensorCone', 'laserBeam', 'target'],
    highlight: ['sensorBall', 'sensorCone', 'laserBeam'],
  },
  strike: {
    camera: 'strike',
    speed: NORMAL_SPEED,
    view: { cutaway: false },
    startAt: CHAPTER_START_UNITS.strike,
    controls: ['targetRange'],
    load: 'armed',
    labels: ['hellfire', 'pylons', 'missile', 'laserBeam', 'target', 'sensorBall'],
    highlight: ['hellfire', 'missile', 'laserBeam', 'target'],
  },
  endurance: {
    camera: 'orbit',
    speed: ENDURANCE_SPEED,
    view: { cutaway: false, track: true },
    startAt: CHAPTER_START_UNITS.endurance,
    controls: ['areaDistance'],
    labels: ['wing', 'fuelTank', 'hellfire', 'bombs', 'runway'],
    highlight: ['fuelTank', 'wing'],
  },
};
