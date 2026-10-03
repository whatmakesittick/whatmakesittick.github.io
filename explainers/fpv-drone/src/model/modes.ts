import { FLIGHT_MODE_IDS } from '../ids';
import type { FlightModeId } from '../ids';
import { MAX_RATE_DEG_S } from './figures';

export interface FlightMode {
  stickKey: string;
  limitKey: string;
}

export const DEFAULT_MAX_RATE_DEG_S = MAX_RATE_DEG_S;

export const FLIGHT_MODES: Readonly<Record<FlightModeId, FlightMode>> = Object.fromEntries(
  FLIGHT_MODE_IDS.map((id) => [id, { stickKey: `mode.stick.${id}`, limitKey: `mode.limit.${id}` }]),
) as Record<FlightModeId, FlightMode>;
