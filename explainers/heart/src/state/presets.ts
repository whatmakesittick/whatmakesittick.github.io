import type { ScenePreset } from '@core/scene/presetBinder';
import { VALVE_PARTS } from '../ids';
import type { ChamberId, PartId, ValveId, ViewOptions } from '../ids';

export type PresetId = 'overview' | 'chambers' | 'valves' | 'cycle' | 'conduction' | 'circulation';

export type CameraView = 'front' | 'section' | 'valve' | 'left' | 'septum' | 'whole';

export type ChapterControl = 'chamber' | 'valve' | 'effort';

export type Selection = 'chamber' | 'valve';

export interface SelectedParts {
  chamber: ChamberId;
  valve: ValveId;
}

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
  controls?: readonly ChapterControl[];
  highlightsSelected?: Selection;
}

export const DEFAULT_CHAMBER: ChamberId = 'leftVentricle';
export const DEFAULT_VALVE: ValveId = 'mitral';

const BEAT_START_MS = 0;
const VALVES_WITH_CORDS: ReadonlySet<ValveId> = new Set<ValveId>(['mitral', 'tricuspid']);

export function valveHighlight(valve: ValveId): readonly PartId[] {
  const part = VALVE_PARTS[valve];
  return VALVES_WITH_CORDS.has(valve) ? [part, 'chordae'] : [part];
}

const CONDUCTION_PARTS: readonly PartId[] = [
  'sinusNode',
  'avNode',
  'bundleBranches',
  'purkinjeFibres',
];

const LEFT_HEART_PARTS: readonly PartId[] = [
  'leftAtrium',
  'leftVentricle',
  'mitralValve',
  'aorticValve',
  'aorta',
];

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'front',
    speed: 2,
    view: { cutaway: false, flow: true, conduction: false },
    labels: [
      'aorta',
      'pulmonaryTrunk',
      'superiorVenaCava',
      'rightVentricle',
      'leftVentricle',
      'apex',
      'coronaries',
    ],
    highlight: [],
  },
  chambers: {
    camera: 'section',
    speed: 1,
    view: { cutaway: true, flow: true, conduction: false },
    controls: ['chamber'],
    labels: ['rightAtrium', 'rightVentricle', 'leftAtrium', 'leftVentricle', 'septum'],
    highlight: [DEFAULT_CHAMBER],
    highlightsSelected: 'chamber',
  },
  valves: {
    camera: 'valve',
    speed: 0,
    view: { cutaway: true, flow: true, conduction: false },
    controls: ['valve'],
    labels: ['tricuspidValve', 'pulmonaryValve', 'mitralValve', 'aorticValve', 'chordae'],
    highlight: valveHighlight(DEFAULT_VALVE),
    highlightsSelected: 'valve',
  },
  cycle: {
    camera: 'left',
    speed: 1,
    view: { cutaway: true, flow: true, conduction: false },
    startAt: BEAT_START_MS,
    labels: LEFT_HEART_PARTS,
    highlight: [...LEFT_HEART_PARTS, 'arterialBlood'],
  },
  conduction: {
    camera: 'septum',
    speed: 0,
    view: { cutaway: true, flow: false, conduction: true },
    startAt: BEAT_START_MS,
    labels: CONDUCTION_PARTS,
    highlight: CONDUCTION_PARTS,
  },
  circulation: {
    camera: 'whole',
    speed: 3,
    view: { cutaway: false, flow: true, conduction: false },
    controls: ['effort'],
    labels: [
      'aorta',
      'archBranches',
      'pulmonaryArteries',
      'pulmonaryVeins',
      'superiorVenaCava',
      'inferiorVenaCava',
      'venousBlood',
      'arterialBlood',
    ],
    highlight: [
      'aorta',
      'archBranches',
      'pulmonaryTrunk',
      'pulmonaryArteries',
      'pulmonaryVeins',
      'superiorVenaCava',
      'inferiorVenaCava',
      'venousBlood',
      'arterialBlood',
    ],
  },
};

export function presetHighlight(preset: Preset, selected: SelectedParts): readonly PartId[] {
  if (preset.highlightsSelected === 'chamber') return [selected.chamber];
  if (preset.highlightsSelected === 'valve') return valveHighlight(selected.valve);
  return preset.highlight;
}
