import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

const THREAD_GLOW = 0.3;
const PAINT_GLOW = 0.35;

export const FINISHES = {
  enamel: { color: '#ece6d8', metalness: 0.05, roughness: 0.36 },
  bedEnamel: { color: '#d6cfc1', metalness: 0.05, roughness: 0.42 },
  trim: { color: '#474e59', metalness: 0.35, roughness: 0.48 },
  rubber: { color: '#2d3239', metalness: 0.1, roughness: 0.7 },
  chrome: { color: '#dde1e7', metalness: 1, roughness: 0.2 },
  steel: { color: '#b3bac4', metalness: 0.85, roughness: 0.3 },
  darkSteel: { color: '#5a626d', metalness: 0.85, roughness: 0.36 },
  hookSteel: { color: '#7a838f', metalness: 0.6, roughness: 0.45 },
  needleSteel: { color: '#d9dee5', metalness: 0.55, roughness: 0.28 },
  plastic: { color: '#e3e8ee', metalness: 0.05, roughness: 0.3 },
  spoolCap: { color: '#d9c3a0', metalness: 0, roughness: 0.55 },
  paint: {
    color: THEME.accent,
    metalness: 0.2,
    roughness: 0.45,
    emissive: THEME.accent,
    emissiveIntensity: PAINT_GLOW,
  },
  topThread: {
    color: THEME.topThread,
    metalness: 0,
    roughness: 0.6,
    emissive: THEME.topThread,
    emissiveIntensity: THREAD_GLOW,
  },
  bobbinThread: {
    color: THEME.bobbinThread,
    metalness: 0,
    roughness: 0.6,
    emissive: THEME.bobbinThread,
    emissiveIntensity: THREAD_GLOW,
  },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;

export const TRANSLUCENT_COLORS = {
  plate: '#b3bac4',
  plateGuide: '#3a404a',
  fabricTop: '#e9dcc4',
  fabricBottom: '#b59f84',
} as const;
