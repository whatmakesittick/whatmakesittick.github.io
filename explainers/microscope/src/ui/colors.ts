import type { Rgb } from '../model';

const CHANNEL_MAX = 255;

export function cssColor([red, green, blue]: Rgb): string {
  const channel = (value: number) => Math.round(value * CHANNEL_MAX);
  return `rgb(${channel(red)} ${channel(green)} ${channel(blue)})`;
}
