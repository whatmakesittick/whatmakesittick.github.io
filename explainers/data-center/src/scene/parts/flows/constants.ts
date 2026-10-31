import { THEME } from '../../../theme';

export const FLOW_RATE = 1.4;

export const PITCH = {
  rack: 0.12,
  building: 0.8,
  outdoor: 2.4,
  packets: 0.9,
  arrows: 1.3,
} as const;

export const RACK_ZONE = { halfX: 0.8, halfZ: 1.3, top: 2.5 } as const;

export const PULL = { share: 0.025, min: 0.03, max: 2.5 } as const;

export const RENDER_ORDER = {
  ghost: 4,
  trail: 5,
  particles: 6,
  puffs: 7,
  halo: 20,
  bead: 21,
} as const;

export const TRAIL = {
  width: 0.0026,
  glow: 0.38,
  ghost: 0.14,
  dashGlow: 0.12,
  duty: 0.32,
} as const;

export const PARTICLE_PX = { power: 7, water: 6, flicker: 5 } as const;

export const IDLE_DENSITY = 2;

export const BEAD = {
  core: 0.022,
  halo: 0.085,
  minDistance: 0.6,
  heatTint: THEME.heat,
  currentTint: THEME.current,
  coreTint: '#fff1cf',
  heatCoreTint: '#ffd6c8',
} as const;

export const HALO_STOPS = [
  { offset: 0, color: 'rgba(255,255,255,0.95)' },
  { offset: 0.2, color: 'rgba(255,255,255,0.8)' },
  { offset: 0.33, color: 'rgba(255,255,255,0.55)' },
  { offset: 0.38, color: 'rgba(24,18,12,0.85)' },
  { offset: 0.44, color: 'rgba(24,18,12,0.2)' },
  { offset: 0.5, color: 'rgba(255,255,255,0.3)' },
  { offset: 1, color: 'rgba(255,255,255,0)' },
] as const;

export const TEXTURE_PX = 128;

export const HEAT_TINTS = {
  full: THEME.coolantReturn,
  idle: '#e98a5f',
  supply: THEME.coolantSupply,
} as const;

export const AIR_ARROW = {
  length: 0.26,
  radius: 0.1,
  segments: 10,
  opacity: 0.5,
  tint: '#ff6b4f',
  columns: [3, 7, 11, 15],
  floorY: 0.5,
} as const;

export const WATER_OFFSET = { indoor: 0.09, roof: 0.55, direction: [0.55, 0.45, 0.7] } as const;

export const PLUME = {
  puffsPerCooler: 3,
  rate: 0.09,
  size: [3.5, 10],
  alpha: { full: 0.2, idle: 0.12 },
  height: { full: 1, idle: 0.55 },
  converge: 0.45,
  drift: 3,
  tint: { full: '#ff8a5c', idle: '#f2b894' },
} as const;

export const EXHAUST = {
  puffsPerStack: 5,
  rate: 0.55,
  rise: 6,
  drift: 2.5,
  size: [0.8, 3.6],
  alpha: 0.55,
  tint: '#4a4e55',
  stackShareX: 0.32,
  stackHeight: 1.3,
} as const;

export const PACKETS = {
  width: 0.0032,
  rate: 2.2,
  lift: 0.08,
  flickerRate: 9,
  flickerOn: 0.55,
  flickerDim: 0.12,
  portsPerTray: 6,
  trays: 4,
} as const;

export const GENERATOR_FEED = { aisleX: -35, sideGap: 0.6 } as const;
