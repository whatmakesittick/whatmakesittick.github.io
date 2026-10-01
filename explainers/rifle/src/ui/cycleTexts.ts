import { clamp } from '@core/math';
import { CYCLE_MS } from '../model';
import { CARRIER_STROKE } from '../model/layout';
import { cycleOf } from '../state';
import type { RifleState } from '../state';
import { formatMs, formatPercent } from './format';

export function carrierShare(state: RifleState): number {
  return clamp(cycleOf(state).motion.carrier / CARRIER_STROKE, 0, 1);
}

export function carrierPercent(state: RifleState): string {
  return formatPercent(carrierShare(state));
}

export function timeUntilReady(state: RifleState): string {
  return formatMs(CYCLE_MS - cycleOf(state).ms);
}
