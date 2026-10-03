import { SPEEDSTER_IDS } from '../ids';
import type { SpeedsterId } from '../ids';
import { TOP_SPEED_KMH } from './figures';
import { OUTBOUND_LENGTH } from './layout';
import { toMetresPerSecond } from './scale';

export interface Speedster {
  topKmh: number;
  whoKey: string;
}

export const SPEEDSTERS: Readonly<Record<SpeedsterId, Speedster>> = Object.fromEntries(
  SPEEDSTER_IDS.map((id) => [id, { topKmh: TOP_SPEED_KMH[id], whoKey: `speeds.who.${id}` }]),
) as Record<SpeedsterId, Speedster>;

export function secondsOverField(kmh: number): number {
  return OUTBOUND_LENGTH / toMetresPerSecond(kmh);
}
