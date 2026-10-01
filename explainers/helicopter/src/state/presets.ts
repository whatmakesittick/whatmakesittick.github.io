import type { ScenePreset } from '@core/scene/presetBinder';
import { COLLECTIVE_RANGE } from '../model';
import type { FlightMode } from '../model';

export type PresetId = 'overview' | 'collective' | 'torque' | 'forward';

export type CameraView = 'overview' | 'rotor' | 'hub' | 'tail';

export type PartId =
  'mainRotor' | 'markedBlade' | 'swashplate' | 'fuselage' | 'tailBoom' | 'tailRotor' | 'skids';

export type ViewOptions = {
  labels: boolean;
  flow: boolean;
};

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
  flightMode?: FlightMode;
  collective?: number;
}

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'overview',
    view: { flow: true },
    speed: 40,
    flightMode: 'hover',
    collective: COLLECTIVE_RANGE.hover,
    labels: [],
    highlight: [],
  },
  collective: {
    camera: 'hub',
    speed: 20,
    flightMode: 'hover',
    labels: ['mainRotor', 'swashplate'],
    highlight: ['mainRotor', 'markedBlade', 'swashplate'],
  },
  torque: {
    camera: 'tail',
    speed: 40,
    flightMode: 'hover',
    collective: COLLECTIVE_RANGE.hover,
    labels: ['tailRotor', 'tailBoom'],
    highlight: ['tailRotor', 'tailBoom'],
  },
  forward: {
    camera: 'rotor',
    view: { flow: true },
    speed: 20,
    flightMode: 'forward',
    collective: COLLECTIVE_RANGE.hover,
    labels: ['markedBlade'],
    highlight: ['mainRotor', 'markedBlade'],
  },
};
