export const PART_IDS = [
  'derrick',
  'topDrive',
  'drillFloor',
  'helideck',
  'crane',
  'flareBoom',
  'column',
  'pontoon',
  'thruster',
  'mooring',
  'moonpool',
  'riser',
  'bop',
  'wellhead',
  'conductor',
  'surfaceCasing',
  'intermediateCasing',
  'drillPipe',
  'drillCollars',
  'bit',
  'annulus',
  'seabed',
  'claystone',
  'aquifer',
  'seal',
  'gasCap',
  'oil',
  'oilWaterContact',
  'sourceRock',
  'tubing',
  'perforations',
  'flare',
] as const;

export type PartId = (typeof PART_IDS)[number];

export type RegionId =
  'scene' | 'rig' | 'waterline' | 'drillFloor' | 'seabed' | 'well' | 'trap' | 'completion';

export type AnchorId = 'bit' | 'topDrive' | 'bop' | 'reservoir';

export type BitId = 'pdc' | 'rollerCone';

export type SectionId = 'conductor' | 'surface' | 'intermediate' | 'production' | 'reservoir';

export type LayerId =
  'seabed' | 'claystone' | 'aquifer' | 'shaleSands' | 'seal' | 'reservoir' | 'base' | 'sourceRock';

export type FluidId = 'gas' | 'oil' | 'water';

export type MudState = 'safe' | 'light' | 'heavy';

export interface ViewOptions {
  cutaway: boolean;
  mud: boolean;
  flow: boolean;
  labels: boolean;
}

export interface AssemblyState {
  bitDepth: number;
  draft: number;
  mudWeight: number;
  mudState: MudState;
  bit: BitId;
  view: ViewOptions;
}
