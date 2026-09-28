import { PHASE_IDS } from '../ids';
import type { PhaseId } from '../ids';
import { THEME } from '../theme';

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX_RADIX = 16;

export function withAlpha(hex: string, alpha: number): string {
  const match = HEX_COLOR.exec(hex);
  if (!match) throw new Error(`Expected a #rrggbb colour, got "${hex}"`);
  const [red, green, blue] = match.slice(1).map((channel) => parseInt(channel, HEX_RADIX));
  return `rgb(${red} ${green} ${blue} / ${alpha})`;
}

export const PHASE_COLORS: Readonly<Record<PhaseId, string>> = Object.fromEntries(
  PHASE_IDS.map((id) => [id, THEME[id]]),
) as Record<PhaseId, string>;

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
  volume: THEME.fill,
  trace: THEME.node,
  waveBand: withAlpha(THEME.node, 0.08),
  squeeze: THEME.eject,
  fill: THEME.fill,
  barText: THEME.background,
} as const;
