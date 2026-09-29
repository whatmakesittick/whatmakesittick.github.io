import { setAttributes } from './dom';

export interface NumericRange {
  min: number;
  max: number;
  step: number;
}

const PERCENT = 100;
const VALUE_TEXT = 'aria-valuetext';
const FILL_PROPERTY = '--fill';

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
  const text = String(value);
  if (input.value !== text) input.value = text;
  if (input.getAttribute(VALUE_TEXT) !== valueText) input.setAttribute(VALUE_TEXT, valueText);
  const fraction = rangeFraction(value, { min: Number(input.min), max: Number(input.max) });
  const fill = toPercent(fraction);
  if (input.style.getPropertyValue(FILL_PROPERTY) !== fill)
    input.style.setProperty(FILL_PROPERTY, fill);
}
