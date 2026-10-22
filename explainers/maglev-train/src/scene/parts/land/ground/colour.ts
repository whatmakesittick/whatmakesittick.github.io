import { clamp } from '@core/math';

const CHANNEL = 255;
const HEX_RADIX = 16;
const CHANNEL_SHIFTS = [16, 8, 0] as const;

function channels(hex: string): number[] {
  const value = parseInt(hex.slice(1), HEX_RADIX);
  return CHANNEL_SHIFTS.map((shift) => (value >> shift) & CHANNEL);
}

function style(rgb: readonly number[]): string {
  return `rgba(${rgb.map((value) => Math.round(clamp(value, 0, CHANNEL))).join()},1)`;
}

export function shade(hex: string, factor: number): string {
  return style(channels(hex).map((value) => value * factor));
}

export function grey(level: number): string {
  const value = level * CHANNEL;
  return style([value, value, value]);
}
