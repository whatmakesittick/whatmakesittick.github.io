import { clamp } from '@core/math';
import type { OdorantLevels, SniffId } from '../ids';
import { AROMA_FULL } from './aroma';
import { emptyLevels } from './odorants';
import { RECEPTOR_ODORANTS, RECEPTOR_TYPES } from './receptorCodes';

export const RECEPTOR_GAIN = 3;
export const FIRING_THRESHOLD = 0.2;
export const SNIFF_BOTTLE_SHARE = 0.5;

const bottle = emptyLevels();

function sniffedLevels(nose: Readonly<OdorantLevels>, sniff: SniffId): Readonly<OdorantLevels> {
  if (sniff === 'mix') return nose;
  Object.assign(bottle, emptyLevels());
  bottle[sniff] = SNIFF_BOTTLE_SHARE * AROMA_FULL;
  return bottle;
}

export function emptyActivation(): number[] {
  return new Array<number>(RECEPTOR_TYPES).fill(0);
}

export function receptorActivation(
  nose: Readonly<OdorantLevels>,
  sniff: SniffId,
  out: number[] = emptyActivation(),
): number[] {
  const levels = sniffedLevels(nose, sniff);
  RECEPTOR_ODORANTS.forEach((odorants, index) => {
    const sum = odorants.reduce((total, id) => total + levels[id], 0);
    out[index] = clamp((RECEPTOR_GAIN * sum) / AROMA_FULL, 0, 1);
  });
  return out;
}

export function firingCount(activation: readonly number[]): number {
  return activation.filter((level) => level >= FIRING_THRESHOLD).length;
}
