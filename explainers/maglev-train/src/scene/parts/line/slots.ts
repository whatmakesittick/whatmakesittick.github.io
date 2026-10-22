import type { Extent } from '@core/scene/regions';
import type { WaveReading } from '../../../ids';
import { LINE_M, SECTION_M } from '../../../model';
import { lineX } from '../../pose';

type SectionReading = Pick<WaveReading, 'sectionStart' | 'sectionEnd' | 'nextSectionIndex'>;

const HALF = 0.5;

export function slotIndices(period: number, behind: number, ahead: number): number[] {
  const first = -Math.ceil(behind / period);
  const last = Math.ceil(ahead / period);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

export function slotCentre(slot: number, period: number): number {
  return (slot + HALF) * period;
}

export function poweredLine(wave: SectionReading): Extent {
  if (wave.nextSectionIndex === null) return [wave.sectionStart, wave.sectionEnd];
  const nextEnd = Math.min((wave.nextSectionIndex + 1) * SECTION_M, LINE_M);
  return [wave.sectionStart, Math.max(wave.sectionEnd, nextEnd)];
}

export function poweredStrip(wave: SectionReading, distance: number): Extent {
  const [start, end] = poweredLine(wave);
  return [lineX(start, distance), lineX(end, distance)];
}

export function clipped([from, to]: Extent, [low, high]: Extent): Extent | null {
  const start = Math.max(from, low);
  const end = Math.min(to, high);
  return start < end ? [start, end] : null;
}

export function overlaps(centre: number, halfLength: number, [low, high]: Extent): boolean {
  return centre + halfLength >= low && centre - halfLength <= high;
}
