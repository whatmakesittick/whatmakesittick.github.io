import { smoothstep } from '@core/math';

export const KICKBACK_SHOW_SECONDS = 2.4;
export const RISE_SECONDS = 0.5;
export const RETURN_SECONDS = 1;
export const GUARD_TRIP_SECONDS = 0.2;
export const GUARD_SWING_SECONDS = 0.1;
export const RISE_DEG = 35;

export interface KickbackPose {
  riseDeg: number;
  guardForward: number;
  tripped: boolean;
}

export const AT_REST: Readonly<KickbackPose> = { riseDeg: 0, guardForward: 0, tripped: false };

function riseShare(seconds: number): number {
  const returning = KICKBACK_SHOW_SECONDS - RETURN_SECONDS;
  if (seconds < RISE_SECONDS) return smoothstep(seconds, 0, RISE_SECONDS);
  if (seconds < returning) return 1;
  return 1 - smoothstep(seconds, returning, KICKBACK_SHOW_SECONDS);
}

export function kickbackPose(seconds: number): KickbackPose {
  if (seconds < 0 || seconds >= KICKBACK_SHOW_SECONDS) return AT_REST;
  return {
    riseDeg: RISE_DEG * riseShare(seconds),
    guardForward: smoothstep(seconds, GUARD_TRIP_SECONDS, GUARD_TRIP_SECONDS + GUARD_SWING_SECONDS),
    tripped: seconds >= GUARD_TRIP_SECONDS,
  };
}
