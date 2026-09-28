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
  highlightsWorkingDiodes?: boolean;
}

export interface HighlightContext {
  layer: LayerId;
  diodeWorking: boolean;
}

const MORNING_START_PHASE = 210;
const LAYERS_EXPLODE = 0.6;
const BYPASS_DIODE: PartId = 'bypassDiode';

const SLICE_PARTS: readonly PartId[] = [
  'pyramids',
  'arCoating',
  'emitter',
  'junction',
  'base',
  'rearContact',
  'finger',
];

const WIRING_PARTS: readonly PartId[] = ['cell', 'ribbon', 'busbar', 'junctionBox', BYPASS_DIODE];

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'roof',
    speed: 15,
    view: { sun: true, slice: false },
    startAt: MORNING_START_PHASE,
    labels: ['sun', 'panel', 'inverter', 'roof'],
    highlight: [],
  },
  sun: {
    camera: 'sky',
    speed: 10,
    view: { sun: true, slice: false },
    controls: ['tilt'],
    labels: ['sun', 'panel', 'frame'],
    highlight: ['panel', 'frame', 'sun'],
  },
  layers: {
    camera: 'stack',
    speed: 4,
    view: { slice: false },
    explode: LAYERS_EXPLODE,
    controls: ['explode', 'layer'],
    labels: ['glass', 'encapsulant', 'cell', 'backsheet', 'frame', 'junctionBox'],
    highlight: ['glass'],
    highlightsSelectedLayer: true,
  },
  junction: {
    camera: 'cell',
    speed: 2,
    view: { slice: true, flow: true },
    startAt: SUN_MOMENTS.noon,
    controls: ['wavelength'],
    labels: SLICE_PARTS,
    highlight: SLICE_PARTS,
  },
  wiring: {
    camera: 'strings',
    speed: 6,
    view: { slice: false },
    controls: ['shade', 'layout'],
    labels: WIRING_PARTS,
    highlight: WIRING_PARTS,
    highlightsWorkingDiodes: true,
  },
  inverter: {
    camera: 'inverter',
    speed: 15,
    view: { flow: true },
    controls: ['temperature'],
    labels: ['inverter', 'meter', 'dcCable', 'acCable', 'connector'],
    highlight: ['inverter', 'meter', 'dcCable', 'acCable', 'connector', 'junctionBox'],
  },
};

export function presetHighlight(preset: Preset, context: HighlightContext): readonly PartId[] {
  if (preset.highlightsSelectedLayer) return [context.layer];
  if (preset.highlightsWorkingDiodes && !context.diodeWorking) {
    return preset.highlight.filter((id) => id !== BYPASS_DIODE);
  }
  return preset.highlight;
}
