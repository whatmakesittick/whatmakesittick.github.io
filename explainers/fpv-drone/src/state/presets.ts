import type { ScenePreset } from '@core/scene/presetBinder';
import type {
  CameraView,
  FlightModeId,
  MoveId,
  PacketRate,
  PartId,
  PresetId,
  SpeedsterId,
  VideoId,
  ViewOptions,
} from '../ids';

export type ChapterControl =
  'move' | 'tilt' | 'flightMode' | 'packetRate' | 'payload' | 'speedster';

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
  controls?: readonly ChapterControl[];
}

export const DEFAULT_VIDEO: VideoId = 'analogue';
export const DEFAULT_MOVE: MoveId = 'hover';
export const DEFAULT_FLIGHT_MODE: FlightModeId = 'acro';
export const DEFAULT_PACKET_RATE: PacketRate = 250;
export const DEFAULT_SPEEDSTER: SpeedsterId = 'longRange';

const CHAPTER_START_S: Readonly<Record<PresetId, number>> = {
  overview: 0,
  flight: 5,
  controller: 16,
  link: 20,
  power: 30,
  limits: 52,
};

const NORMAL_SPEED = 1;

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'chase',
    speed: NORMAL_SPEED,
    view: { links: true, track: true },
    startAt: CHAPTER_START_S.overview,
    labels: ['frame', 'propellers', 'battery', 'camera', 'videoAntenna', 'groundStation'],
    highlight: [],
  },
  flight: {
    camera: 'top',
    speed: NORMAL_SPEED,
    view: { arrows: true },
    startAt: CHAPTER_START_S.flight,
    controls: ['move', 'tilt'],
    labels: [
      'motorFrontLeft',
      'motorFrontRight',
      'motorRearLeft',
      'motorRearRight',
      'propellers',
      'spinArrows',
    ],
    highlight: [
      'motorFrontLeft',
      'motorFrontRight',
      'motorRearLeft',
      'motorRearRight',
      'propellers',
    ],
  },
  controller: {
    camera: 'close',
    speed: NORMAL_SPEED,
    view: { arrows: false },
    startAt: CHAPTER_START_S.controller,
    controls: ['flightMode'],
    labels: ['stack', 'receiverAntenna', 'gpsModule', 'camera', 'battery'],
    highlight: ['stack', 'receiverAntenna'],
  },
  link: {
    camera: 'pilot',
    speed: NORMAL_SPEED,
    view: { links: true },
    startAt: CHAPTER_START_S.link,
    controls: ['packetRate'],
    labels: [
      'groundStation',
      'controlLink',
      'videoLink',
      'videoAntenna',
      'receiverAntenna',
      'camera',
    ],
    highlight: ['controlLink', 'videoLink', 'groundStation'],
  },
  power: {
    camera: 'side',
    speed: NORMAL_SPEED,
    startAt: CHAPTER_START_S.power,
    controls: ['payload'],
    labels: ['battery', 'stack', 'motorFrontLeft', 'motorRearLeft', 'propellers'],
    highlight: ['battery'],
  },
  limits: {
    camera: 'fpv',
    speed: NORMAL_SPEED,
    view: { track: true },
    startAt: CHAPTER_START_S.limits,
    controls: ['speedster'],
    labels: ['crossroads', 'groundStation'],
    highlight: [],
  },
};
