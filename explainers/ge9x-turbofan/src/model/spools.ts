import { clamp, smoothstep } from '@core/math';

export const FAN_IDLE_SHARE = 0.3;
export const CORE_IDLE_SHARE = 0.55;
export const LEVER_CURVE = 0.8;
export const REVERSE_LEVER_CAP = 0.6;
export const FAN_VISUAL_TURNS_MAX = 1.2;
export const CORE_RATIO_TO_FAN = 4.4;
export const FAN_BLUR_START = 0.3;
export const FAN_BLUR_MAX = 0.55;
export const FAN_BLADE_MIN_OPACITY = 0.6;

export interface SpoolShares {
  fan: number;
  core: number;
}

export function effectiveLever(lever: number, reverserDeploy: number): number {
  const capped = Math.min(lever, REVERSE_LEVER_CAP);
  return clamp(lever + (capped - lever) * clamp(reverserDeploy, 0, 1), 0, 1);
}

function share(idle: number, lever: number): number {
  return idle + (1 - idle) * Math.pow(clamp(lever, 0, 1), LEVER_CURVE);
}

export function spoolSpeeds(lever: number, reverserDeploy: number): SpoolShares {
  const effective = effectiveLever(lever, reverserDeploy);
  return { fan: share(FAN_IDLE_SHARE, effective), core: share(CORE_IDLE_SHARE, effective) };
}

export function fanTurnsPerSecond(fanShare: number): number {
  return fanShare * FAN_VISUAL_TURNS_MAX;
}

export function coreTurnsPerSecond(coreShare: number): number {
  return fanTurnsPerSecond(coreShare) * CORE_RATIO_TO_FAN;
}

export function fanBlurOpacity(fanShare: number): number {
  return smoothstep(fanShare, FAN_BLUR_START, 1) * FAN_BLUR_MAX;
}

export function fanBladeOpacity(fanShare: number): number {
  const blur = fanBlurOpacity(fanShare) / FAN_BLUR_MAX;
  return 1 - blur * (1 - FAN_BLADE_MIN_OPACITY);
}
