import { AdditiveBlending, DoubleSide } from 'three';
import type { Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';
import { AIRFIELD, COMPOUND, SATELLITE_SHAPE } from './constants';

export const PAINT = {
  airframe: THEME.airframe,
  airframeDark: THEME.airframeDark,
  radome: '#a7aeb6',
  ball: '#aeb4bb',
  glass: THEME.sensorGlass,
  bezel: '#2a2f36',
  strut: '#4a5058',
  chrome: '#c9ced4',
  tyre: '#1b1c1e',
  hub: '#8c939b',
  well: '#22262b',
  blade: '#2a2d32',
  spinner: '#7d848c',
  olive: '#56603f',
  seeker: '#8e9397',
  band: '#d6ae35',
  fuel: THEME.fuel,
  engine: '#8b9096',
  gearbox: '#9a7b4f',
  dish: '#e8ebef',
  navRed: '#ff3b30',
  navGreen: '#34ff6a',
  navWhite: '#ffffff',
} as const;

const PAINT_REFLECTION = 1.3;
const METAL_REFLECTION = 1.6;
const GLASS_REFLECTION = 2.6;
const LIGHT_GLOW = 3;

export const FINISHES = {
  airframeGhost: {
    color: PAINT.airframe,
    metalness: 0.1,
    roughness: 0.4,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: DoubleSide,
  },
  wingGhost: {
    color: PAINT.airframe,
    metalness: 0.1,
    roughness: 0.4,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  },
  plain: {
    color: PAINT.airframe,
    metalness: 0.15,
    roughness: 0.5,
    envMapIntensity: PAINT_REFLECTION,
  },
  dark: {
    color: PAINT.airframeDark,
    metalness: 0.3,
    roughness: 0.5,
    envMapIntensity: PAINT_REFLECTION,
  },
  ball: { color: PAINT.ball, metalness: 0.25, roughness: 0.38, envMapIntensity: METAL_REFLECTION },
  glass: { color: PAINT.glass, metalness: 0.4, roughness: 0.05, envMapIntensity: GLASS_REFLECTION },
  bezel: { color: PAINT.bezel, metalness: 0.4, roughness: 0.45, envMapIntensity: PAINT_REFLECTION },
  strut: { color: PAINT.strut, metalness: 0.6, roughness: 0.4, envMapIntensity: METAL_REFLECTION },
  chrome: { color: PAINT.chrome, metalness: 1, roughness: 0.18, envMapIntensity: METAL_REFLECTION },
  tyre: { color: PAINT.tyre, metalness: 0, roughness: 0.9, envMapIntensity: 0.4 },
  hub: { color: PAINT.hub, metalness: 0.7, roughness: 0.35, envMapIntensity: METAL_REFLECTION },
  well: { color: PAINT.well, metalness: 0.1, roughness: 0.85, envMapIntensity: 0.3 },
  door: {
    color: PAINT.airframe,
    metalness: 0.15,
    roughness: 0.5,
    envMapIntensity: PAINT_REFLECTION,
    side: DoubleSide,
  },
  blade: {
    color: PAINT.blade,
    metalness: 0.25,
    roughness: 0.42,
    envMapIntensity: PAINT_REFLECTION,
  },
  spinner: {
    color: PAINT.spinner,
    metalness: 0.5,
    roughness: 0.3,
    envMapIntensity: METAL_REFLECTION,
  },
  olive: {
    color: PAINT.olive,
    metalness: 0.15,
    roughness: 0.62,
    envMapIntensity: PAINT_REFLECTION,
  },
  seeker: {
    color: PAINT.seeker,
    metalness: 0.45,
    roughness: 0.35,
    envMapIntensity: METAL_REFLECTION,
  },
  band: { color: PAINT.band, metalness: 0.1, roughness: 0.55, envMapIntensity: PAINT_REFLECTION },
  fuel: {
    color: PAINT.fuel,
    emissive: PAINT.fuel,
    emissiveIntensity: 0.18,
    metalness: 0.2,
    roughness: 0.38,
    envMapIntensity: PAINT_REFLECTION,
  },
  engine: {
    color: PAINT.engine,
    metalness: 0.85,
    roughness: 0.32,
    envMapIntensity: METAL_REFLECTION,
  },
  gearbox: {
    color: PAINT.gearbox,
    metalness: 0.8,
    roughness: 0.36,
    envMapIntensity: METAL_REFLECTION,
  },
  dish: {
    color: PAINT.dish,
    metalness: 0.2,
    roughness: 0.35,
    envMapIntensity: PAINT_REFLECTION,
    side: DoubleSide,
  },
  navRed: {
    color: PAINT.navRed,
    emissive: PAINT.navRed,
    emissiveIntensity: LIGHT_GLOW,
    toneMapped: false,
  },
  navGreen: {
    color: PAINT.navGreen,
    emissive: PAINT.navGreen,
    emissiveIntensity: LIGHT_GLOW,
    toneMapped: false,
  },
  navWhite: {
    color: PAINT.navWhite,
    emissive: PAINT.navWhite,
    emissiveIntensity: LIGHT_GLOW,
    toneMapped: false,
  },
} as const satisfies Record<string, MaterialFinish>;

export const GLOW_SPRITE = {
  transparent: true,
  blending: AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
} as const;

export interface AirframeMaps {
  fuselage: Texture;
  hump: Texture;
  wing: Texture;
}

export interface AirframeLooks {
  fuselage: MaterialFinish;
  hump: MaterialFinish;
  wing: MaterialFinish;
  tail: MaterialFinish;
}

function painted(color: string, map?: Texture): MaterialFinish {
  return {
    color,
    ...(map ? { map } : {}),
    vertexColors: true,
    metalness: 0.15,
    roughness: 0.46,
    envMapIntensity: PAINT_REFLECTION,
  };
}

export function createAirframeLooks(maps: AirframeMaps): AirframeLooks {
  return {
    fuselage: painted(PAINT.airframe, maps.fuselage),
    hump: painted(PAINT.radome, maps.hump),
    wing: painted(PAINT.airframe, maps.wing),
    tail: painted(PAINT.airframe),
  };
}

const GROUND_REFLECTION = 0.35;

function matte(color: string, roughness = 0.9): MaterialFinish {
  return { color, metalness: 0, roughness, envMapIntensity: GROUND_REFLECTION };
}

export const WORLD_FINISHES = {
  asphalt: matte(AIRFIELD.colours.asphalt, 0.85),
  taxiway: matte(AIRFIELD.colours.taxiway, 0.85),
  blastPad: matte(AIRFIELD.colours.blastPad, 0.88),
  shoulder: matte(AIRFIELD.colours.shoulder),
  concrete: matte(AIRFIELD.colours.concrete, 0.8),
  marking: {
    ...matte(AIRFIELD.colours.marking, 0.7),
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  },
  taxiLine: {
    ...matte(AIRFIELD.colours.taxiLine, 0.7),
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  },
  hangar: { color: AIRFIELD.colours.hangar, metalness: 0.45, roughness: 0.5, envMapIntensity: 0.8 },
  hangarInside: {
    color: AIRFIELD.colours.hangarInside,
    emissive: AIRFIELD.colours.hangarInside,
    emissiveIntensity: 0.9,
    roughness: 1,
    metalness: 0,
  },
  container: {
    color: AIRFIELD.colours.container,
    metalness: 0.2,
    roughness: 0.6,
    envMapIntensity: 0.7,
  },
  trim: { color: AIRFIELD.colours.trim, metalness: 0.3, roughness: 0.6, envMapIntensity: 0.6 },
  mast: { color: AIRFIELD.colours.mast, metalness: 0.6, roughness: 0.4, envMapIntensity: 0.9 },
  dish: {
    color: PAINT.dish,
    metalness: 0.2,
    roughness: 0.4,
    envMapIntensity: 0.8,
    side: DoubleSide,
  },
  yard: {
    ...matte(COMPOUND.yard.colour),
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  },
  wall: matte(COMPOUND.wall.colour),
  building: matte(COMPOUND.building.colour, 0.85),
  roof: matte(COMPOUND.building.roof),
  door: matte(COMPOUND.building.door),
  vehicle: {
    color: COMPOUND.vehicle.colour,
    metalness: 0.3,
    roughness: 0.45,
    envMapIntensity: 0.8,
  },
  vehicleGlass: {
    color: COMPOUND.vehicle.windscreen,
    metalness: 0.4,
    roughness: 0.1,
    envMapIntensity: 1.6,
  },
  charred: matte(COMPOUND.vehicle.charred, 1),
  palm: matte('#4d5a2e', 0.85),
  trunk: matte('#6b5236'),
  foil: {
    color: SATELLITE_SHAPE.colours.foil,
    metalness: 0.9,
    roughness: 0.3,
    envMapIntensity: 1.8,
    fog: false,
  },
  satelliteDish: {
    color: SATELLITE_SHAPE.colours.dish,
    metalness: 0.2,
    roughness: 0.35,
    fog: false,
    side: DoubleSide,
  },
  satelliteFrame: { color: '#9aa0a6', metalness: 0.7, roughness: 0.35, fog: false },
} as const satisfies Record<string, MaterialFinish>;

export function solarPanelFinish(map: Texture): MaterialFinish {
  return {
    color: '#ffffff',
    map,
    metalness: 0.6,
    roughness: 0.3,
    envMapIntensity: 1.4,
    fog: false,
  };
}

export function sandFinish(map: Texture): MaterialFinish {
  return {
    color: '#ffffff',
    map,
    vertexColors: true,
    metalness: 0,
    roughness: 0.94,
    envMapIntensity: GROUND_REFLECTION,
  };
}
