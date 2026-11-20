export const SCALE_IDS = ['head', 'tongue', 'molecules'] as const;

export type ScaleId = (typeof SCALE_IDS)[number];

export const HEAD_PART_IDS = [
  'spoon',
  'bite',
  'tongue',
  'palate',
  'airway',
  'throat',
  'nostrils',
  'nasalCavity',
  'smellPatch',
  'olfactoryBulb',
] as const;

export const TONGUE_PART_IDS = [
  'papilla',
  'tasteBud',
  'nerve',
  'melt',
  'iceCrystal',
  'fatDroplet',
  'airBubble',
  'aromaCloud',
] as const;

export const MOLECULE_PART_IDS = [
  'benzaldehyde',
  'hexenal',
  'linalool',
  'eugenol',
  'ionone',
  'receptors',
  'neuron',
  'mucus',
] as const;

export const PART_IDS = [...HEAD_PART_IDS, ...TONGUE_PART_IDS, ...MOLECULE_PART_IDS] as const;

export type PartId = (typeof PART_IDS)[number];

export type HeadPartId = (typeof HEAD_PART_IDS)[number];

export type TonguePartId = (typeof TONGUE_PART_IDS)[number];

export type MoleculePartId = (typeof MOLECULE_PART_IDS)[number];

function scaleOfParts<T extends PartId>(ids: readonly T[], scale: ScaleId): Record<T, ScaleId> {
  return Object.fromEntries(ids.map((id) => [id, scale])) as Record<T, ScaleId>;
}

export const PART_SCALE: Readonly<Record<PartId, ScaleId>> = {
  ...scaleOfParts(HEAD_PART_IDS, 'head'),
  ...scaleOfParts(TONGUE_PART_IDS, 'tongue'),
  ...scaleOfParts(MOLECULE_PART_IDS, 'molecules'),
};

export const PHASE_IDS = ['spoon', 'tongue', 'melting', 'rising', 'receptors', 'swallow'] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export const MOMENT_IDS = ['inMouth', 'melted', 'firing', 'swallow'] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export const PRESET_IDS = ['tongue', 'routes', 'receptors', 'cherry', 'desk', 'iceCream'] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const ODORANT_IDS = ['benzaldehyde', 'hexenal', 'linalool', 'eugenol', 'ionone'] as const;

export type OdorantId = (typeof ODORANT_IDS)[number];

export type OdorantLevels = Record<OdorantId, number>;

export const NOTE_IDS = ['almond', 'green', 'floral', 'clove', 'violet'] as const;

export type NoteId = (typeof NOTE_IDS)[number];

export const FOOD_IDS = ['cherry', 'sweets', 'marzipan'] as const;

export type FoodId = (typeof FOOD_IDS)[number];

export const FLAVOR_IDS = [...FOOD_IDS, 'desk'] as const;

export type FlavorId = (typeof FLAVOR_IDS)[number];

export const SMELL_IDS = ['cherry', 'sweets', 'marzipan', 'new', 'empty'] as const;

export type SmellId = (typeof SMELL_IDS)[number];

export const SNIFF_IDS = ['mix', ...ODORANT_IDS] as const;

export type SniffId = (typeof SNIFF_IDS)[number];

export const RECIPE_IDS = ['fruit', 'sweets', 'clear'] as const;

export type RecipeId = (typeof RECIPE_IDS)[number];

export const PERCEPT_IDS = [
  'nothing',
  'smell',
  'cold',
  'sweet',
  'flavor',
  'pinched',
  'aftertaste',
  'gone',
] as const;

export type PerceptId = (typeof PERCEPT_IDS)[number];

export const NOSE_CHOICE_IDS = ['open', 'pinched'] as const;

export type NoseChoiceId = (typeof NOSE_CHOICE_IDS)[number];

export const CHAPTER_ACTION_IDS = ['scale', 'nose', 'food', 'sniff', 'recipe'] as const;

export type ChapterActionId = (typeof CHAPTER_ACTION_IDS)[number];

export const ELEMENT_IDS = ['C', 'O', 'H'] as const;

export type ElementId = (typeof ELEMENT_IDS)[number];

export const VIEW_IDS = ['labels', 'pinched'] as const;

export type ViewId = (typeof VIEW_IDS)[number];

export type ViewOptions = Record<ViewId, boolean>;

export const CAMERA_VIEW_IDS = [
  'profile',
  'nose',
  'tongue',
  'scoop',
  'receptors',
  'molecules',
] as const;

export type CameraView = (typeof CAMERA_VIEW_IDS)[number];

export const VIEW_SCALE: Readonly<Record<CameraView, ScaleId>> = {
  profile: 'head',
  nose: 'head',
  tongue: 'tongue',
  scoop: 'tongue',
  receptors: 'molecules',
  molecules: 'molecules',
};

export const VIEW_IN_SCALE: Readonly<Record<CameraView, Readonly<Record<ScaleId, CameraView>>>> = {
  profile: { head: 'profile', tongue: 'tongue', molecules: 'receptors' },
  nose: { head: 'nose', tongue: 'scoop', molecules: 'receptors' },
  tongue: { head: 'profile', tongue: 'tongue', molecules: 'molecules' },
  scoop: { head: 'profile', tongue: 'scoop', molecules: 'molecules' },
  receptors: { head: 'nose', tongue: 'scoop', molecules: 'receptors' },
  molecules: { head: 'nose', tongue: 'scoop', molecules: 'molecules' },
};

export const REGION_IDS = [
  'head',
  'nose',
  'tonguePatch',
  'scoop',
  'receptorGrid',
  'lineup',
] as const;

export type RegionId = (typeof REGION_IDS)[number];

export const REGION_SCALE: Readonly<Record<RegionId, ScaleId>> = {
  head: 'head',
  nose: 'head',
  tonguePatch: 'tongue',
  scoop: 'tongue',
  receptorGrid: 'molecules',
  lineup: 'molecules',
};

export const ANCHOR_IDS = ['bite', 'smellPatch', 'tongueBite', 'grid'] as const;

export type AnchorId = (typeof ANCHOR_IDS)[number];

export const ANCHOR_SCALE: Readonly<Record<AnchorId, ScaleId>> = {
  bite: 'head',
  smellPatch: 'head',
  tongueBite: 'tongue',
  grid: 'molecules',
};

export type Point = readonly [x: number, y: number, z: number];

export interface TasteReading {
  sweet: number;
  sour: number;
  cold: number;
}

export interface FlavorReading {
  seconds: number;
  phase: PhaseId;
  phaseProgress: number;
  temperatureC: number;
  melt: number;
  inMouth: boolean;
  swallow: number;
  flavor: FlavorId;
  smell: SmellId;
  profile: OdorantLevels;
  mouth: OdorantLevels;
  ortho: OdorantLevels;
  retro: OdorantLevels;
  nose: OdorantLevels;
  released: number;
  noseShare: number;
  taste: TasteReading;
  percept: PerceptId;
  receptors: number[];
  firing: number;
}

export interface AssemblyState {
  scale: ScaleId;
  phase: number;
  playing: boolean;
  reading: FlavorReading;
  copies: Record<OdorantId, number>;
  sniff: SniffId;
  fatPercent: number;
  view: ViewOptions;
}
