import { setAttributes } from './dom';

export interface NumericRange {
  min: number;
  max: number;
  step: number;
}

const PERCENT = 100;

export function configureRange(input: HTMLInputElement, range: NumericRange): void {
  setAttributes(input, { min: range.min, max: range.max, step: range.step });
}

export function rangeFraction(value: number, range: Pick<NumericRange, 'min' | 'max'>): number {
  return (value - range.min) / (range.max - range.min);
}

export function toPercent(fraction: number): string {
  return `${fraction * PERCENT}%`;
}

export function showRangeValue(input: HTMLInputElement, value: number, valueText: string): void {
  input.value = String(value);
  input.setAttribute('aria-valuetext', valueText);
  const fraction = rangeFraction(value, { min: Number(input.min), max: Number(input.max) });
  input.style.setProperty('--fill', toPercent(fraction));
}
