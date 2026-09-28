import type { EventId } from '../ids';

export interface PercentRange {
  readonly low: number;
  readonly high: number;
}

export const WHOLE_PERCENT = 100;

function single(percent: number): PercentRange {
  return { low: percent, high: percent };
}

export const AEROBIC_SHARE: Readonly<Record<EventId, PercentRange>> = {
  m100: { low: 10, high: 20 },
  m200: single(30),
  m400: { low: 40, high: 45 },
  m800: single(66),
  m1500: { low: 80, high: 85 },
  m5000: single(90),
  marathon: single(99),
};

export function aerobicShare(event: EventId): PercentRange {
  return AEROBIC_SHARE[event];
}

export function anaerobicShare(event: EventId): PercentRange {
  const { low, high } = aerobicShare(event);
  return { low: WHOLE_PERCENT - high, high: WHOLE_PERCENT - low };
}

export function middleOf(range: PercentRange): number {
  return (range.low + range.high) / 2;
}

export function isSingleValue(range: PercentRange): boolean {
  return range.low === range.high;
}
