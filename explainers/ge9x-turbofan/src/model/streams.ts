import { clamp, lerp } from '@core/math';
import type { DetailId, StreamId } from '../ids';
import { effectiveLever } from './spools';

export const COLD_BUFFER = 1500;
export const HOT_BUFFER = 240;
export const FAR_SHARE = 0.6;
export const HOT_TO_COLD_RATIO = 1.6;
export const COLD_IDLE_SPEED = 0.3;
export const REVERSE_COLD_DIRECTION = -0.55;

export interface StreamSpeeds {
  cold: number;
  hot: number;
}

export interface ParticleCounts {
  cold: number;
  hot: number;
}

export function streamSpeeds(lever: number, reverserDeploy: number): StreamSpeeds {
  const cold = lerp(COLD_IDLE_SPEED, 1, effectiveLever(lever, reverserDeploy));
  return { cold, hot: cold * HOT_TO_COLD_RATIO };
}

export function coldDirection(reverserDeploy: number): number {
  return lerp(1, REVERSE_COLD_DIRECTION, clamp(reverserDeploy, 0, 1));
}

export function particleCounts(streams: StreamId, detail: DetailId): ParticleCounts {
  const share = detail === 'near' ? 1 : FAR_SHARE;
  return {
    cold: streams === 'hot' ? 0 : Math.round(COLD_BUFFER * share),
    hot: streams === 'cold' ? 0 : Math.round(HOT_BUFFER * share),
  };
}
