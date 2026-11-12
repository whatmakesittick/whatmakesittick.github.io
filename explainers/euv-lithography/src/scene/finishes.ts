import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

const GHOST_OPACITY = 0.09;
const WINDOW_OPACITY = 0.22;
const MEMBRANE_OPACITY = 0.3;

function finish(color: string, roughness: number, metalness = 0): MaterialFinish {
  return { color, roughness, metalness };
}

function veil(color: string, opacity: number): MaterialFinish {
  return {
    color,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity,
    depthWrite: false,
    side: DoubleSide,
  };
}

function glow(color: string, intensity: number): MaterialFinish {
  return { color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 };
}

export const FINISHES = {
  panel: finish('#d3d8de', 0.5),
  panelShade: finish(THEME.machine, 0.55),
  shell: finish(THEME.shell, 0.45, 0.35),
  shellInner: { ...finish('#3c444e', 0.72), side: DoubleSide },
  ghost: veil(THEME.shell, GHOST_OPACITY),
  window: veil('#a9c4dc', WINDOW_OPACITY),
  frame: finish('#6f7a86', 0.42, 0.6),
  darkFrame: finish('#3a4048', 0.5, 0.5),
  machined: finish('#2a3037', 0.36, 0.7),
  interior: { ...finish('#14181d', 0.88), side: DoubleSide },
  rail: finish('#c3cad2', 0.18, 0.95),
  flange: finish('#b4bdc7', 0.28, 0.9),
  bolt: finish('#dfe3e8', 0.25, 0.95),
  rubber: finish('#22262b', 0.9),
  cable: finish('#2e3238', 0.75),
  tray: finish('#949da6', 0.45, 0.7),
  copper: finish('#b8734a', 0.32, 0.88),
  accent: finish('#3d6fb6', 0.45, 0.2),
  safety: finish('#e2b93b', 0.55),
  ceramic: finish('#d9c6a5', 0.35),
  granite: finish('#3b3f45', 0.62),
  mirror: finish(THEME.mirror, 0.05, 1),
  collector: finish('#c9b8ee', 0.07, 1),
  tin: finish(THEME.tin, 0.22, 0.92),
  wall: finish('#d9d6cf', 0.85),
  subfloor: finish('#8d9096', 0.8),
  floor: finish(THEME.floor, 0.7),
  hatch: finish(THEME.hatch, 0.6, 0.3),
  laserCase: finish('#e6e8ea', 0.4, 0.1),
  laserGlow: glow(THEME.laser, 1.4),
  maskPlate: finish(THEME.maskPlate, 0.18, 0.6),
  membrane: veil('#e9eef5', MEMBRANE_OPACITY),
  wafer: finish(THEME.wafer, 0.2, 0.75),
  slitGlow: glow(THEME.euv, 2.4),
  insetPanel: { ...finish(THEME.inset, 0.85), side: DoubleSide },
  insetLine: { ...glow(THEME.insetLine, 0.35), side: DoubleSide },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;
