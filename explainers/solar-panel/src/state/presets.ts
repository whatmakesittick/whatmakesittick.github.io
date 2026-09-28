import type { ScenePreset } from '@core/scene/presetBinder';
import type { LayerId, PartId, ViewOptions } from '../ids';
import { SUN_MOMENTS } from '../model';

export type PresetId = 'overview' | 'sun' | 'layers' | 'junction' | 'wiring' | 'inverter';

export type CameraView = 'roof' | 'sky' | 'stack' | 'cell' | 'strings' | 'inverter';

export type ChapterControl =
  'tilt' | 'explode' | 'layer' | 'wavelength' | 'shade' | 'layout' | 'temperature';

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
  explode?: number;
  controls?: readonly ChapterControl[];
  highlightsSelectedLayer?: boolean;
}

const MORNING_START_PHASE = 210;
const LAYERS_EXPLODE = 0.8;

const SLICE_PARTS: readonly PartId[] = [
  'pyramids',
  'arCoating',
  'emitter',
  'junction',
  'base',
  'rearContact',
  'finger',
];

const WIRING_PARTS: readonly PartId[] = ['cell', 'ribbon', 'busbar', 'junctionBox', 'bypassDiode'];

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'roof',
    speed: 16,
    view: { sun: true, slice: false, flow: false },
    startAt: MORNING_START_PHASE,
    labels: ['sun', 'panel', 'inverter', 'roof'],
    highlight: [],
  },
  sun: {
    camera: 'sky',
    speed: 10,
    view: { sun: true, slice: false, flow: false },
    controls: ['tilt'],
    labels: ['sun', 'panel', 'frame'],
    highlight: ['panel', 'frame', 'sun'],
  },
  layers: {
    camera: 'stack',
    speed: 4,
    view: { sun: false, slice: false, flow: false },
    explode: LAYERS_EXPLODE,
    controls: ['explode', 'layer'],
    labels: ['glass', 'encapsulant', 'cell', 'backsheet', 'frame', 'junctionBox'],
    highlight: ['glass'],
    highlightsSelectedLayer: true,
  },
  junction: {
    camera: 'cell',
    speed: 2,
    view: { sun: false, slice: true, flow: true },
    startAt: SUN_MOMENTS.noon,
    controls: ['wavelength'],
    labels: SLICE_PARTS,
    highlight: SLICE_PARTS,
  },
  wiring: {
    camera: 'strings',
    speed: 6,
    view: { sun: false, slice: false, flow: true },
    controls: ['shade', 'layout'],
    labels: WIRING_PARTS,
    highlight: WIRING_PARTS,
  },
  inverter: {
    camera: 'inverter',
    speed: 16,
    view: { sun: false, flow: true },
    controls: ['temperature'],
    labels: ['inverter', 'meter', 'dcCable', 'acCable', 'connector'],
    highlight: ['inverter', 'meter', 'dcCable', 'acCable', 'connector', 'junctionBox'],
  },
};

export function presetHighlight(preset: Preset, layer: LayerId): readonly PartId[] {
  return preset.highlightsSelectedLayer ? [layer] : preset.highlight;
}
