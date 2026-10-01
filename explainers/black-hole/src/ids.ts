export const PHASE_IDS = ['letGo', 'plunge', 'noOrbit', 'lightRing', 'inside'] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

export const PART_IDS = [
  'horizon',
  'photonSphere',
  'disc',
  'probe',
  'ship',
  'beacon',
  'sheetProbe',
] as const;
export type PartId = (typeof PART_IDS)[number];

export const ANCHOR_IDS = ['probe', 'ship', 'hole'] as const;
export type AnchorId = (typeof ANCHOR_IDS)[number];

export const REGION_IDS = ['scene', 'system', 'hole', 'probeClose', 'sheet'] as const;
export type RegionId = (typeof REGION_IDS)[number];

export const BLACK_HOLE_IDS = ['sgrA', 'm87', 'stellar'] as const;
export type BlackHoleId = (typeof BLACK_HOLE_IDS)[number];

export const MOMENT_IDS = ['lastOrbit', 'lightRing', 'horizon'] as const;
export type MomentId = (typeof MOMENT_IDS)[number];

export const FLASH_TONES = ['white', 'orange', 'red', 'infrared', 'gone'] as const;
export type FlashTone = (typeof FLASH_TONES)[number];

export const VIEW_IDS = ['disc', 'sheet', 'labels'] as const;
export type ViewId = (typeof VIEW_IDS)[number];
export type ViewOptions = Record<ViewId, boolean>;

export interface AssemblyState {
  phase: number;
  playing: boolean;
  view: ViewOptions;
}
