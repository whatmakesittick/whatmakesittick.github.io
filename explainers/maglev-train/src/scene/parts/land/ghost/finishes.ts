import type { MaterialFinish } from '@core/scene/materials';

const PAINTED = '#ffffff';

function painted(roughness: number, metalness: number, lift = 0): MaterialFinish {
  const offset =
    lift === 0
      ? {}
      : { polygonOffset: true, polygonOffsetFactor: -lift, polygonOffsetUnits: -lift };
  return { color: PAINTED, vertexColors: true, roughness, metalness, ...offset };
}

export const TRACK_FINISHES = {
  ballast: painted(0.97, 0, 1),
  trackside: painted(0.78, 0.12, 2),
  rails: painted(0.6, 0.2, 3),
} as const satisfies Record<string, MaterialFinish>;

export const TRACK_TONES = {
  ballast: {
    crib: '#c4c3bf',
    rust: '#b3a698',
    bed: '#cccbc7',
    shoulder: '#d3d2ce',
    slope: '#c8c7c3',
    toe: '#a29b8f',
  },
  sleeper: '#b5b1a8',
  baseplate: '#3b3d40',
  rail: { crown: '#c9ccce', corner: '#8b8681', head: '#66584d', web: '#5e4535' },
  mast: { steel: '#a7adb1', insulator: '#6e4935', footing: '#ada89f' },
} as const;

export const WIRE_LINE = { color: '#463d35', opacity: 0.85 } as const;

export const GHOST_LINE = { color: '#eef5ff', opacity: 0.6 } as const;
