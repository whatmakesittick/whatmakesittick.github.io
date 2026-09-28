import { THEME } from '../theme';

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX_RADIX = 16;
const CHANNEL_MAX = 255;

export function withAlpha(hex: string, alpha: number): string {
  const match = HEX_COLOR.exec(hex);
  if (!match) throw new Error(`Expected a #rrggbb colour, got "${hex}"`);
  const [red, green, blue] = match.slice(1).map((channel) => parseInt(channel, HEX_RADIX));
  return `rgb(${red} ${green} ${blue} / ${alpha})`;
}

export function rgbCss([red, green, blue]: readonly [number, number, number]): string {
  const channel = (value: number) => Math.round(value * CHANNEL_MAX);
  return `rgb(${channel(red)} ${channel(green)} ${channel(blue)})`;
}

export const CANVAS_COLORS = {
  grid: 'rgb(255 255 255 / 0.07)',
  axis: 'rgb(255 255 255 / 0.22)',
  tick: THEME.muted,
  lit: THEME.text,
  usable: THEME.noon,
  heat: withAlpha(THEME.hole, 0.6),
  weak: withAlpha(THEME.muted, 0.4),
  gap: withAlpha(THEME.text, 0.55),
  markerLine: 'rgb(255 255 255 / 0.5)',
  curve: THEME.sun,
  clearCurve: withAlpha(THEME.muted, 0.55),
  powerBox: withAlpha(THEME.sun, 0.1),
  point: THEME.sun,
} as const;
