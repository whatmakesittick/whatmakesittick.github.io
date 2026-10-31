export const PART_IDS = [
  'gridLine',
  'substation',
  'transformers',
  'generators',
  'switchgear',
  'ups',
  'batteries',
  'busway',
  'hall',
  'racks',
  'subjectRack',
  'powerShelves',
  'busbar',
  'computeTrays',
  'switchTrays',
  'trayFans',
  'chipInset',
  'manifold',
  'cdu',
  'facilityPipes',
  'chiller',
  'dryCoolers',
  'airHandlers',
  'fibreEntry',
  'spineSwitches',
  'leafSwitches',
  'joule',
  'laptop',
] as const;
export type PartId = (typeof PART_IDS)[number];

export const LEFT_LABEL_PARTS: readonly PartId[] = [
  'gridLine',
  'substation',
  'transformers',
  'generators',
  'ups',
  'batteries',
  'chipInset',
  'powerShelves',
  'trayFans',
  'laptop',
  'fibreEntry',
  'manifold',
];

const RANKED_LABELS: readonly PartId[] = [
  'joule',
  'chipInset',
  'subjectRack',
  'busbar',
  'powerShelves',
  'cdu',
  'ups',
  'generators',
  'computeTrays',
  'switchTrays',
  'dryCoolers',
  'chiller',
  'spineSwitches',
  'leafSwitches',
  'laptop',
];

export const LABEL_PRIORITY: readonly PartId[] = [
  ...RANKED_LABELS,
  ...PART_IDS.filter((id) => !RANKED_LABELS.includes(id)),
];

export const PHASE_IDS = ['grid', 'protect', 'distribute', 'compute', 'cool', 'release'] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = ['atRack', 'becomesHeat', 'inCoolant', 'onRoof'] as const;
export type MomentId = (typeof MOMENT_IDS)[number];

export const PRESET_IDS = ['building', 'powerIn', 'rack', 'network', 'heatOut', 'compare'] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export const CHAPTER_ACTION_IDS = [
  'moment',
  'outage',
  'load',
  'distance',
  'cooling',
  'benchmark',
] as const;
export type ChapterActionId = (typeof CHAPTER_ACTION_IDS)[number];

export const COOLING_IDS = ['liquid', 'air'] as const;
export type CoolingId = (typeof COOLING_IDS)[number];

export const LOAD_IDS = ['full', 'idle'] as const;
export type LoadId = (typeof LOAD_IDS)[number];

export const BENCHMARK_IDS = ['average', 'best'] as const;
export type BenchmarkId = (typeof BENCHMARK_IDS)[number];

export const DISTANCE_IDS = ['km100', 'km1000'] as const;
export type DistanceId = (typeof DISTANCE_IDS)[number];

export const OUTAGE_IDS = ['cut'] as const;
export type OutageId = (typeof OUTAGE_IDS)[number];

export const SOURCE_IDS = ['grid', 'battery', 'generator'] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const CARRIER_IDS = [
  'line',
  'cable',
  'ups',
  'busway',
  'busbar',
  'chip',
  'water',
  'air',
] as const;
export type CarrierId = (typeof CARRIER_IDS)[number];

export const FORM_IDS = ['current', 'heat'] as const;
export type FormId = (typeof FORM_IDS)[number];

export const MEDIUM_IDS = ['water', 'air'] as const;
export type MediumId = (typeof MEDIUM_IDS)[number];

export const DOCK_VIEW_IDS = ['power', 'heat', 'packets', 'labels', 'cutaway', 'follow'] as const;
export const VIEW_IDS = [...DOCK_VIEW_IDS, 'inset', 'lineUp'] as const;
export type DockViewId = (typeof DOCK_VIEW_IDS)[number];
export type ViewId = (typeof VIEW_IDS)[number];
export type ViewOptions = Record<ViewId, boolean>;

export const CAMERA_VIEW_IDS = [
  'campus',
  'powerYard',
  'rackSide',
  'networkRow',
  'coolingPlant',
  'lineUp',
  'chase',
] as const;
export type CameraView = (typeof CAMERA_VIEW_IDS)[number];

export const ANCHOR_IDS = [
  'joule',
  'subjectRack',
  'inset',
  'chip',
  'cdu',
  'roof',
  'lineUp',
] as const;
export type AnchorId = (typeof ANCHOR_IDS)[number];

export const REGION_IDS = [
  'campus',
  'powerYard',
  'rack',
  'networkRow',
  'coolingPlant',
  'lineUp',
] as const;
export type RegionId = (typeof REGION_IDS)[number];

export type Point = readonly [x: number, y: number, z: number];

export interface JouleReading {
  phase: PhaseId;
  units: number;
  share: number;
  realSeconds: number;
  position: Point;
  heading: number;
  form: FormId;
  carrier: CarrierId;
  span: number;
}

export interface RackReading {
  rackKw: number;
  hallMw: number;
  fanShare: number;
}

export interface CoolantReading {
  medium: MediumId;
  supplyC: number;
  returnC: number;
  flowShare: number;
}

export interface OutageReading {
  source: SourceId;
  gridOn: boolean;
  generatorShare: number;
  batteryShare: number;
}

export interface OutageState {
  token: number;
}

export interface ChaseTarget {
  position: Point;
  heading: number;
  pitch: number;
  roll: number;
  span: number;
}

export interface AssemblyState {
  phase: number;
  playing: boolean;
  cooling: CoolingId;
  load: LoadId;
  joule: JouleReading;
  rack: RackReading;
  coolant: CoolantReading;
  outage: OutageState;
  view: ViewOptions;
}
