import { clamp } from '@core/math';
import type { LinkReading, PacketRate, Point } from '../ids';
import { LINK_REACH_M, SENSITIVITY_DBM, VIDEO_FIGURES } from './figures';
import { STATION } from './layout';

export type SignalGrade = 'strong' | 'good' | 'weak' | 'lost';

export const VIDEO_SYSTEMS = VIDEO_FIGURES;
export const REFERENCE_PACKET_RATE: PacketRate = 500;
export const SIGNAL_THRESHOLDS = { strong: 0.6, good: 0.3, weak: 0.05 } as const;

const MILLISECONDS_PER_SECOND = 1000;
const DECIBELS_PER_DECADE_OF_AMPLITUDE = 20;

export function distanceAt(position: Point): number {
  return Math.hypot(position[0] - STATION[0], position[1] - STATION[1], position[2] - STATION[2]);
}

export function packetPeriodMs(rate: PacketRate): number {
  return MILLISECONDS_PER_SECOND / rate;
}

export function sensitivityDbm(rate: PacketRate): number {
  return SENSITIVITY_DBM[rate];
}

export function rangeFactor(rate: PacketRate): number {
  const gain = SENSITIVITY_DBM[REFERENCE_PACKET_RATE] - SENSITIVITY_DBM[rate];
  return 10 ** (gain / DECIBELS_PER_DECADE_OF_AMPLITUDE);
}

export function signalShareAt(distance: number): number {
  const reach = Math.log(LINK_REACH_M.far / LINK_REACH_M.near);
  return clamp(1 - Math.log(distance / LINK_REACH_M.near) / reach, 0, 1);
}

export function signalGradeOf(share: number): SignalGrade {
  if (share >= SIGNAL_THRESHOLDS.strong) return 'strong';
  if (share >= SIGNAL_THRESHOLDS.good) return 'good';
  if (share >= SIGNAL_THRESHOLDS.weak) return 'weak';
  return 'lost';
}

export function linkAt(position: Point): LinkReading {
  const distance = distanceAt(position);
  return { distance, signal: signalShareAt(distance) };
}
