import { WAVE_IDS } from '../ids';
import type { PhaseId, WaveId } from '../ids';
import { THEME } from '../theme';

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX_RADIX = 16;
const WAVE_BAND_ALPHA = 0.12;

export function withAlpha(hex: string, alpha: number): string {
  const match = HEX_COLOR.exec(hex);
  if (!match) throw new Error(`Expected a #rrggbb colour, got "${hex}"`);
  const [red, green, blue] = match.slice(1).map((channel) => parseInt(channel, HEX_RADIX));
  return `rgb(${red} ${green} ${blue} / ${alpha})`;
}

export const PHASE_COLORS: Readonly<Record<PhaseId, string>> = {
  atria: THEME.atria,
  squeeze: THEME.squeeze,
  eject: THEME.eject,
  relax: THEME.relax,
  fill: THEME.filling,
  rest: THEME.rest,
};

const WAVE_COLORS: Readonly<Record<WaveId, string>> = {
  p: THEME.atria,
  qrs: THEME.eject,
  t: THEME.relax,
};

export const WAVE_BANDS = Object.fromEntries(
  WAVE_IDS.map((wave) => [wave, withAlpha(WAVE_COLORS[wave], WAVE_BAND_ALPHA)]),
) as Readonly<Record<WaveId, string>>;

export const CANVAS_COLORS = {
  grid: 'rgb(255 255 255 / 0.06)',
  gridMajor: 'rgb(255 255 255 / 0.13)',
  axis: 'rgb(255 255 255 / 0.22)',
  tick: THEME.muted,
  lit: THEME.text,
  cursor: 'rgb(255 255 255 / 0.55)',
  ventricle: THEME.eject,
  aorta: THEME.valve,
  atrium: THEME.atria,
  volume: THEME.filling,
  trace: THEME.node,
  squeeze: THEME.eject,
  fill: THEME.filling,
  barText: THEME.background,
} as const;
