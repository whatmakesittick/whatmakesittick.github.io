import { THEME } from '../../../../theme';
import type { Ink } from './flat';

export const INK = {
  frame: { colour: THEME.insetLine, opacity: 0.9 },
  line: { colour: THEME.insetLine, opacity: 0.8 },
  leader: { colour: THEME.insetLine, opacity: 0.7 },
  wedge: { colour: THEME.insetLine, opacity: 0.06, doubleSided: true },
  board: { colour: '#1f5a43' },
  solder: { colour: '#c4c9cf' },
  substrate: { colour: '#6a5440' },
  interposer: { colour: '#7f8a96' },
  die: { colour: '#5b6a8c' },
  memory: { colour: '#3a444f' },
  paste: { colour: '#dfe3e8', opacity: 0.9 },
  lid: { colour: '#aab2ba' },
  plate: { colour: THEME.copper },
  supply: { colour: THEME.coolantSupply },
  return: { colour: THEME.coolantReturn },
  sink: { colour: '#97a2ad' },
  coolAir: { colour: '#a9cdf0', opacity: 0.55 },
  warmAir: { colour: THEME.heat, opacity: 0.55 },
  heat: { colour: THEME.heat },
  heatHalo: { colour: THEME.heat, opacity: 0.3 },
  current: { colour: THEME.current },
  currentHalo: { colour: THEME.current, opacity: 0.3 },
} as const satisfies Record<string, Ink>;
