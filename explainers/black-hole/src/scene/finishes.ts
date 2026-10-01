import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

const RUNNING_LIGHT_GLOW = 2;
const RIM_MARKER_GLOW = 0.9;
const ENGINE_GLOW = 3;

function glowing(color: string, emissiveIntensity: number): MaterialFinish {
  return { color, emissive: color, emissiveIntensity, metalness: 0.1, roughness: 0.35 };
}

export const FINISHES = {
  probeHull: { color: THEME.probe, metalness: 0.65, roughness: 0.3 },
  beaconDome: glowing(THEME.beacon, 0),
  shipHull: { color: THEME.ship, metalness: 0.7, roughness: 0.4 },
  portLight: glowing(THEME.ring, RUNNING_LIGHT_GLOW),
  starboardLight: glowing(THEME.letGo, RUNNING_LIGHT_GLOW),
  engine: glowing(THEME.sheetGlow, ENGINE_GLOW),
  sheetMarker: glowing(THEME.sheetGlow, 0),
  rimMarker: glowing(THEME.ship, RIM_MARKER_GLOW),
} as const satisfies Record<string, MaterialFinish>;

export type Finishes = typeof FINISHES;
