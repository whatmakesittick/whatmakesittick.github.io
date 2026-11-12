export const PART_IDS = [
  'flash',
  'droplets',
  'driveLaser',
  'beamTransport',
  'vessel',
  'collector',
  'plasma',
  'intermediateFocus',
  'illuminator',
  'maskStage',
  'mask',
  'pellicle',
  'projection',
  'waferStage',
  'wafer',
  'dropletInset',
  'patternInset',
  'hair',
  'virus',
] as const;
export type PartId = (typeof PART_IDS)[number];

export const LEFT_LABEL_PARTS: readonly PartId[] = [
  'droplets',
  'driveLaser',
  'beamTransport',
  'vessel',
  'collector',
  'hair',
  'dropletInset',
  'intermediateFocus',
];

const RANKED_LABELS: readonly PartId[] = [
  'flash',
  'plasma',
  'dropletInset',
  'patternInset',
  'collector',
  'mask',
  'projection',
  'wafer',
  'hair',
  'virus',
  'droplets',
  'driveLaser',
  'intermediateFocus',
  'illuminator',
  'pellicle',
  'maskStage',
  'waferStage',
  'vessel',
  'beamTransport',
];

export const LABEL_PRIORITY: readonly PartId[] = [
  ...RANKED_LABELS,
  ...PART_IDS.filter((id) => !RANKED_LABELS.includes(id)),
];

export const PHASE_IDS = ['droplet', 'prepulse', 'plasma', 'collect', 'mask', 'expose'] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = ['launch', 'firstHit', 'flash', 'atFocus', 'onMask', 'onWafer'] as const;
export type MomentId = (typeof MOMENT_IDS)[number];

export const PRESET_IDS = ['machine', 'light', 'mirrors', 'mask', 'scan', 'compare'] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export const CHAPTER_ACTION_IDS = ['moment', 'bounce', 'machine'] as const;
export type ChapterActionId = (typeof CHAPTER_ACTION_IDS)[number];

export const MACHINE_IDS = ['nxe3600d', 'nxe3800e', 'exe5000'] as const;
export type MachineId = (typeof MACHINE_IDS)[number];

export const OPTICS_IDS = ['na033', 'na055'] as const;
export type OpticsId = (typeof OPTICS_IDS)[number];

export const PLACE_IDS = [
  'generator',
  'flight',
  'plasma',
  'collector',
  'illuminator',
  'mask',
  'projection',
  'wafer',
] as const;
export type PlaceId = (typeof PLACE_IDS)[number];

export const INSET_IDS = ['droplet', 'pattern', 'none'] as const;
export type InsetId = (typeof INSET_IDS)[number];

export const DOCK_VIEW_IDS = ['beam', 'labels', 'cutaway', 'inset', 'follow'] as const;
export const VIEW_IDS = DOCK_VIEW_IDS;
export type DockViewId = (typeof DOCK_VIEW_IDS)[number];
export type ViewId = (typeof VIEW_IDS)[number];
export type ViewOptions = Record<ViewId, boolean>;

export const CAMERA_VIEW_IDS = [
  'overview',
  'source',
  'lightPath',
  'maskStage',
  'waferStage',
  'optics',
  'chase',
] as const;
export type CameraView = (typeof CAMERA_VIEW_IDS)[number];

export const ANCHOR_IDS = [
  'flash',
  'plasma',
  'intermediateFocus',
  'mask',
  'wafer',
  'dropletInset',
  'patternInset',
] as const;
export type AnchorId = (typeof ANCHOR_IDS)[number];

export const REGION_IDS = [
  'machine',
  'source',
  'lightPath',
  'maskStage',
  'waferStage',
  'projection',
] as const;
export type RegionId = (typeof REGION_IDS)[number];

export type Point = readonly [x: number, y: number, z: number];

export interface FlashReading {
  phase: PhaseId;
  units: number;
  share: number;
  realSeconds: number;
  position: Point;
  direction: Point;
  place: PlaceId;
  span: number;
}

export interface LightReading {
  left: number;
  bounces: number;
}

export interface ScanReading {
  share: number;
  maskOffsetM: number;
  waferOffsetM: number;
}

export interface ChaseTarget {
  position: Point;
  span: number;
}

export interface AssemblyState {
  phase: number;
  playing: boolean;
  machine: MachineId;
  optics: OpticsId;
  flash: FlashReading;
  light: LightReading;
  inset: InsetId;
  scan: ScanReading;
  view: ViewOptions;
}
