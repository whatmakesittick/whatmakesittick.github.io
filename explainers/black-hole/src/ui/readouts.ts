import type { Readout } from '@core/explainer';
import { clamp } from '@core/math';
import { PHOTON_SPHERE_RADIUS, RELEASE_RADIUS } from '../model';
import { clocksOf, fallOf } from '../state';
import type { BlackHoleStoreState } from '../state';
import {
  formatClock,
  formatDistance,
  formatLightSpeed,
  formatRatio,
  formatShipClock,
  formatTide,
} from './format';
import {
  DISTANCE_METER_FILL,
  NEUTRAL_TONE,
  RATIO_METER_FILL,
  RING_TONE,
  SPEED_METER_FILL,
  TIDE_METER_FILL,
} from './palette';

const RATIO_METER_DECADES = 2;
const TIDE_METER_FLOOR_G = 1e-4;
const TIDE_METER_DECADES = 6;

function logShare(value: number, floor: number, decades: number): number {
  if (!Number.isFinite(value)) return 1;
  return clamp(Math.log10(value / floor) / decades, 0, 1);
}

function ratioShare(state: BlackHoleStoreState): number {
  return logShare(clocksOf(state).ratio, 1, RATIO_METER_DECADES);
}

function tideShare(state: BlackHoleStoreState): number {
  return logShare(clocksOf(state).tide, TIDE_METER_FLOOR_G, TIDE_METER_DECADES);
}

function shipClockTone(state: BlackHoleStoreState): string {
  return fallOf(state).radius <= PHOTON_SPHERE_RADIUS ? RING_TONE : NEUTRAL_TONE;
}

export const BLACK_HOLE_READOUTS: readonly Readout<BlackHoleStoreState>[] = [
  {
    id: 'probeClock',
    labelKey: 'readouts.probeClock',
    numeric: true,
    value: (state) => formatClock(clocksOf(state).probeClock),
  },
  {
    id: 'shipClock',
    labelKey: 'readouts.shipClock',
    numeric: true,
    value: (state) => formatShipClock(clocksOf(state).shipClock),
    tone: shipClockTone,
  },
  {
    id: 'clockRatio',
    labelKey: 'readouts.clockRatio',
    numeric: true,
    value: (state) => formatRatio(clocksOf(state).ratio),
    meter: { share: ratioShare, fill: RATIO_METER_FILL },
  },
  {
    id: 'distance',
    labelKey: 'readouts.distance',
    numeric: true,
    value: (state) => formatDistance(fallOf(state).radius),
    meter: { share: (state) => fallOf(state).radius / RELEASE_RADIUS, fill: DISTANCE_METER_FILL },
  },
  {
    id: 'speed',
    labelKey: 'readouts.speed',
    numeric: true,
    value: (state) => formatLightSpeed(fallOf(state).speed),
    meter: { share: (state) => fallOf(state).speed, fill: SPEED_METER_FILL },
  },
  {
    id: 'tide',
    labelKey: 'readouts.tide',
    numeric: true,
    value: (state) => formatTide(clocksOf(state).tide),
    meter: { share: tideShare, fill: TIDE_METER_FILL },
  },
];
