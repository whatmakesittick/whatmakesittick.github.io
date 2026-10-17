export const PART_IDS = [
  'body',
  'wheels',
  'seat',
  'tank',
  'tankValve',
  'cornerNozzles',
  'frontNozzles',
  'rearNozzles',
  'jets',
  'forceArrows',
  'fans',
  'runway',
  'ramp',
  'landingPad',
  'ghostPath',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const LABEL_PRIORITY: readonly PartId[] = [
  'jets',
  'cornerNozzles',
  'rearNozzles',
  'tank',
  'ramp',
  'landingPad',
  'forceArrows',
  'ghostPath',
  'tankValve',
  'seat',
  'frontNozzles',
  'fans',
  'wheels',
  'body',
  'runway',
];

export const PHASE_IDS = ['boost', 'ramp', 'launch', 'flip', 'catch', 'rest'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = ['leavesRamp', 'peak', 'rollComplete', 'touchdown', 'stopped'] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const PRESET_IDS = ['tank', 'nozzle', 'boost', 'hop', 'flip', 'limits'] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const CHAPTER_ACTION_IDS = ['gas', 'tank', 'replay'] as const;

export type ChapterActionId = (typeof CHAPTER_ACTION_IDS)[number];

export const GAS_IDS = ['air', 'nitrogen', 'helium'] as const;

export type GasId = (typeof GAS_IDS)[number];

export const TANK_CHOICE_IDS = ['400', '600'] as const;

export type TankChoiceId = (typeof TANK_CHOICE_IDS)[number];

export const CORNER_NOZZLE_IDS = [
  'cornerFrontLeft',
  'cornerFrontRight',
  'cornerRearLeft',
  'cornerRearRight',
] as const;

export const FRONT_NOZZLE_IDS = ['frontLeft', 'frontRight'] as const;

export const REAR_NOZZLE_IDS = [
  'rearOuterLeft',
  'rearInnerLeft',
  'rearInnerRight',
  'rearOuterRight',
] as const;

export const NOZZLE_IDS = [...CORNER_NOZZLE_IDS, ...FRONT_NOZZLE_IDS, ...REAR_NOZZLE_IDS] as const;

export type NozzleId = (typeof NOZZLE_IDS)[number];

export type NozzlePartId = Extract<PartId, 'cornerNozzles' | 'frontNozzles' | 'rearNozzles'>;

export const NOZZLE_PARTS: Readonly<Record<NozzleId, NozzlePartId>> = {
  cornerFrontLeft: 'cornerNozzles',
  cornerFrontRight: 'cornerNozzles',
  cornerRearLeft: 'cornerNozzles',
  cornerRearRight: 'cornerNozzles',
  frontLeft: 'frontNozzles',
  frontRight: 'frontNozzles',
  rearOuterLeft: 'rearNozzles',
  rearInnerLeft: 'rearNozzles',
  rearInnerRight: 'rearNozzles',
  rearOuterRight: 'rearNozzles',
};

export type NozzleThrusts = Readonly<Record<NozzleId, number>>;

export const VIEW_IDS = ['nozzles', 'forces', 'tank', 'ghost', 'labels'] as const;

export type ViewId = (typeof VIEW_IDS)[number];

export type ViewOptions = Record<ViewId, boolean>;

export const CAMERA_VIEW_IDS = [
  'tankClose',
  'nozzleClose',
  'boostSide',
  'rampWide',
  'flipChase',
  'siteWide',
] as const;

export type CameraView = (typeof CAMERA_VIEW_IDS)[number];

export const REGION_IDS = ['site', 'car', 'cabin', 'tail', 'ramp', 'arc'] as const;

export type RegionId = (typeof REGION_IDS)[number];

export const CAR_REGION_IDS = ['car', 'cabin', 'tail'] as const;

export type CarRegionId = (typeof CAR_REGION_IDS)[number];

export type SiteRegionId = Exclude<RegionId, CarRegionId>;

export const ANCHOR_IDS = ['car', 'tank', 'tail', 'rampExit', 'pad'] as const;

export type AnchorId = (typeof ANCHOR_IDS)[number];

export const CAR_ANCHOR_IDS = ['car', 'tank', 'tail'] as const;

export type CarAnchorId = (typeof CAR_ANCHOR_IDS)[number];

export type SiteAnchorId = Exclude<AnchorId, CarAnchorId>;

export type Point = readonly [x: number, y: number, z: number];

export interface CarReading {
  position: Point;
  speed: number;
  height: number;
  roll: number;
  pitch: number;
  onGround: boolean;
  onRamp: boolean;
  airborne: boolean;
}

export interface TankReading {
  pressureBar: number;
  massKg: number;
  massShare: number;
  empty: boolean;
  emptyAtSeconds: number | null;
  shortfallMs: number;
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
  gas: GasId;
  tankLitres: number;
  car: CarReading;
  nozzles: NozzleThrusts;
  tank: TankReading;
  fans: boolean;
  view: ViewOptions;
}
