import { clamp } from '@core/math';
import type { BrakeModeId, TopSpeedId, WaveReading } from '../ids';
import { POLE_PITCH_M } from './constants';
import { SECTION_COUNT, SECTION_M, TRAIN } from './layout';
import { motionAt } from './motion';

export interface SectionReading {
  index: number;
  nextIndex: number | null;
  start: number;
  end: number;
}

const POLES_PER_WAVELENGTH = 2;
const LAST_SECTION = SECTION_COUNT - 1;

export function fieldWavelength(): number {
  return POLES_PER_WAVELENGTH * POLE_PITCH_M;
}

export function statorHz(speedMs: number): number {
  return speedMs / fieldWavelength();
}

function sectionIndexAt(position: number): number {
  return clamp(Math.floor(position / SECTION_M), 0, LAST_SECTION);
}

export function sectionAt(distance: number): SectionReading {
  const index = sectionIndexAt(distance);
  const noseIndex = sectionIndexAt(distance + TRAIN.noseX);
  return {
    index,
    nextIndex: noseIndex > index ? noseIndex : null,
    start: index * SECTION_M,
    end: (index + 1) * SECTION_M,
  };
}

export function waveAt(units: number, topSpeed: TopSpeedId, brakeMode: BrakeModeId): WaveReading {
  const { phase, speedMs, distance } = motionAt(units, topSpeed, brakeMode);
  const braking = phase === 'brake';
  const section = sectionAt(distance);
  return {
    on: speedMs > 0 && !(braking && brakeMode === 'eddy'),
    reversed: braking && brakeMode === 'regen',
    hz: statorHz(speedMs),
    sectionIndex: section.index,
    nextSectionIndex: section.nextIndex,
    sectionStart: section.start,
    sectionEnd: section.end,
  };
}
