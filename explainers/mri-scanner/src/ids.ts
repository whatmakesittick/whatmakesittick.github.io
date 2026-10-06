export const PART_IDS = [
  'room',
  'cover',
  'vacuumVessel',
  'radiationShield',
  'heliumVessel',
  'mainCoils',
  'shieldCoils',
  'shims',
  'coldHead',
  'quenchPipe',
  'gradientX',
  'gradientY',
  'gradientZ',
  'bodyCoil',
  'bore',
  'table',
  'patient',
  'headCoil',
  'sliceSlab',
  'spinArrows',
  'netMagnet',
  'mainField',
  'rfWave',
  'echoWave',
  'fieldLinesGroup',
  'fringeLine',
  'screen',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const PHASE_IDS = ['excite', 'encode', 'refocus', 'echo', 'recover'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = ['pulse90', 'pulse180', 'echoPeak', 'repetitionEnd'] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const PRESET_IDS = [
  'overview',
  'magnet',
  'spins',
  'resonance',
  'gradients',
  'picture',
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const FIELD_IDS = ['field15', 'field30'] as const;

export type FieldId = (typeof FIELD_IDS)[number];

export const WEIGHTING_IDS = ['t1', 't2'] as const;

export type WeightingId = (typeof WEIGHTING_IDS)[number];

export const TISSUE_IDS = ['fat', 'whiteMatter', 'greyMatter', 'fluid'] as const;

export type TissueId = (typeof TISSUE_IDS)[number];

export const GRADIENT_AXIS_IDS = ['x', 'y', 'z'] as const;

export type GradientAxisId = (typeof GRADIENT_AXIS_IDS)[number];

export const CHOICE_IDS = ['field', 'weighting'] as const;

export type ChoiceId = (typeof CHOICE_IDS)[number];

export const FOLLOW_SEQUENCE = 'sequence';

export const AXIS_CHOICE_IDS = [...GRADIENT_AXIS_IDS, FOLLOW_SEQUENCE] as const;

export type AxisChoiceId = (typeof AXIS_CHOICE_IDS)[number];

export const LINE_CHOICE_IDS = ['8', '16', '32', '64'] as const;

export type LineChoiceId = (typeof LINE_CHOICE_IDS)[number];

export const CHAPTER_ACTION_IDS = [
  'field',
  'weighting',
  'tissue',
  'gradientAxis',
  'moment',
  'lines',
] as const;

export type ChapterActionId = (typeof CHAPTER_ACTION_IDS)[number];

export type CameraView = 'room' | 'cryostat' | 'voxel' | 'coil' | 'gradient' | 'console';

export type RegionId = 'room' | 'scanner' | 'layers' | 'voxel' | 'bore' | 'console';

export type AnchorId = 'isocentre' | 'voxel' | 'headCoil' | 'screen' | 'coldHead';

export type Point = readonly [x: number, y: number, z: number];

export type RfPulse = 0 | 90 | 180;

export interface Fringe {
  along: number;
  side: number;
}

export interface SequenceReading {
  phase: number;
  step: PhaseId;
  rf: RfPulse | null;
  gradient: GradientAxisId | null;
  gradientLevel: number;
  echo: number;
}

export interface SpinReading {
  net: Point;
  arrows: readonly Point[];
  precession: number;
}

export interface ViewOptions {
  cutaway: boolean;
  fieldLines: boolean;
  voxel: boolean;
  labels: boolean;
}

export interface AssemblyState {
  phase: number;
  playing: boolean;
  field: FieldId;
  weighting: WeightingId;
  sequence: SequenceReading;
  spins: SpinReading;
  tissue: TissueId;
  gradientAxis: GradientAxisId | null;
  picture: Float32Array;
  pictureVersion: number;
  fringe: Fringe;
  view: ViewOptions;
}
