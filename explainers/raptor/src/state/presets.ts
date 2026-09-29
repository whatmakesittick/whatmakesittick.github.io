import type { ScenePreset } from '@core/scene/presetBinder';
import type { EngineId, PartId, PropellantId, ViewOptions } from '../ids';
import { START_LEAD } from '../model';
import { PHASE_RANGES } from '../model/phases';

export type PresetId = 'overview' | 'propellants' | 'pumps' | 'chamber' | 'nozzle' | 'ascent';

export type CameraView = 'hero' | 'powerhead' | 'turbopumps' | 'chamber' | 'nozzle' | 'booster';

export type ChapterControl = 'propellant' | 'engine';

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
  controls?: readonly ChapterControl[];
  highlightsPropellant?: boolean;
}

export const DEFAULT_PROPELLANT: PropellantId = 'methane';
export const DEFAULT_ENGINE: EngineId = 'raptor';

const START_COMMAND = 0;
const FULL_THRUST_CLIMB = PHASE_RANGES.climb.start;

const PROPELLANT_PARTS: Readonly<Record<PropellantId, readonly PartId[]>> = {
  methane: ['methaneInlet', 'methanePump', 'coolingChannels', 'methanePreburner', 'liquidMethane'],
  oxygen: ['oxygenInlet', 'oxygenPump', 'oxygenPreburner', 'liquidOxygen'],
};

export function propellantHighlight(propellant: PropellantId): readonly PartId[] {
  return PROPELLANT_PARTS[propellant];
}

const TURBOPUMP_PARTS: readonly PartId[] = [
  'oxygenPump',
  'methanePump',
  'oxygenPreburner',
  'methanePreburner',
  'hotGasManifold',
  'oxygenRichGas',
  'methaneRichGas',
];

const NOZZLE_PARTS: readonly PartId[] = ['throat', 'nozzle', 'plume', 'shockDiamonds'];

const CLOSED_VIEW = { cutaway: false, flow: false, flame: true, cluster: false } as const;
const CUT_VIEW = { cutaway: true, flow: true, flame: true, cluster: false } as const;

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'hero',
    speed: 3,
    view: CLOSED_VIEW,
    startAt: START_COMMAND,
    labels: ['gimbal', 'oxygenPump', 'methanePump', 'chamber', 'nozzle', 'plume'],
    highlight: [],
  },
  propellants: {
    camera: 'powerhead',
    speed: 2,
    view: CUT_VIEW,
    startAt: FULL_THRUST_CLIMB,
    controls: ['propellant'],
    labels: [
      'oxygenInlet',
      'methaneInlet',
      'oxygenPump',
      'methanePump',
      'coolingChannels',
      'liquidOxygen',
      'liquidMethane',
    ],
    highlight: propellantHighlight(DEFAULT_PROPELLANT),
    highlightsPropellant: true,
  },
  pumps: {
    camera: 'turbopumps',
    speed: 0,
    view: CUT_VIEW,
    startAt: START_COMMAND,
    controls: ['engine'],
    labels: TURBOPUMP_PARTS,
    highlight: TURBOPUMP_PARTS,
  },
  chamber: {
    camera: 'chamber',
    speed: 1,
    view: CUT_VIEW,
    startAt: FULL_THRUST_CLIMB,
    labels: ['injector', 'chamber', 'throat', 'coolingChannels', 'oxygenRichGas', 'methaneRichGas'],
    highlight: [
      'injector',
      'chamber',
      'throat',
      'coolingChannels',
      'hotGasManifold',
      'oxygenRichGas',
      'methaneRichGas',
    ],
  },
  nozzle: {
    camera: 'nozzle',
    speed: 3,
    view: CLOSED_VIEW,
    pauseAt: START_LEAD,
    labels: NOZZLE_PARTS,
    highlight: NOZZLE_PARTS,
  },
  ascent: {
    camera: 'booster',
    speed: 4,
    view: { ...CLOSED_VIEW, cluster: true },
    startAt: START_LEAD,
    labels: ['booster', 'gimbal', 'plume'],
    highlight: [],
  },
};

export interface SelectedParts {
  propellant: PropellantId;
}

export function presetHighlight(preset: Preset, selected: SelectedParts): readonly PartId[] {
  return preset.highlightsPropellant ? propellantHighlight(selected.propellant) : preset.highlight;
}
