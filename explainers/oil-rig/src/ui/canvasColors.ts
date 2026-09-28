import { THEME } from '../theme';

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX_RADIX = 16;

function withAlpha(hex: string, alpha: number): string {
  const match = HEX_COLOR.exec(hex);
  if (!match) throw new Error(`Expected a #rrggbb colour, got "${hex}"`);
  const [red, green, blue] = match.slice(1).map((channel) => parseInt(channel, HEX_RADIX));
  return `rgb(${red} ${green} ${blue} / ${alpha})`;
}

export const CANVAS_COLORS = {
  waterTop: '#1f5c80',
  waterBottom: '#071827',
  sediment: '#3b352e',
  seabedLine: '#8a7d6b',
  surfaceLine: '#7fd3ff',
  grid: 'rgb(255 255 255 / 0.07)',
  tick: THEME.muted,
  lit: THEME.text,
  dim: withAlpha(THEME.muted, 0.3),
  limit: 'rgb(255 255 255 / 0.22)',
  seaBand: withAlpha(THEME.brine, 0.14),
  rockBand: withAlpha(THEME.overburden, 0.08),
  window: withAlpha(THEME.topHole, 0.3),
  windowEdge: withAlpha(THEME.topHole, 0.75),
  pore: THEME.sea,
  fracture: THEME.bottom,
  mud: THEME.gas,
  mudAhead: withAlpha(THEME.gas, 0.3),
  marker: 'rgb(255 255 255 / 0.4)',
  danger: THEME.hull,
  gas: THEME.gas,
  oil: THEME.oil,
  brine: THEME.brine,
  gasPore: '#eef4fa',
  bubble: 'rgb(96 128 160 / 0.85)',
  sand: '#efe6d6',
  sandShaded: '#6e5d45',
  clay: '#ebe3d7',
  shale: '#e2e1de',
  organic: '#8a7862',
  grainLight: 'rgb(255 255 255 / 0.22)',
  grainDark: 'rgb(0 0 0 / 0.14)',
  grainOutline: 'rgb(0 0 0 / 0.4)',
  scaleBack: 'rgb(0 0 0 / 0.55)',
  scaleInk: THEME.text,
} as const;
