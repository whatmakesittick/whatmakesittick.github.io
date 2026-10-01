import { BARREL_TIME_MS, travelTimeMs } from './bore';
import { PEAK_TRAVEL_MM } from './constants';
import { BULLET_SEAT_X, GAS_PORT_X } from './layout';

export const STRIKE_MS = 4;
export const START_MS = 4.2;
export const PEAK_MS = START_MS + travelTimeMs(PEAK_TRAVEL_MM);
export const PORT_TRAVEL_MM = GAS_PORT_X - BULLET_SEAT_X;
export const PORT_MS = START_MS + travelTimeMs(PORT_TRAVEL_MM);
export const EXIT_MS = START_MS + BARREL_TIME_MS;
export const UNLOCKED_MS = 10;
export const REAR_MS = 45;
export const STRIP_MS = 50;
export const LOCKED_MS = 90;
