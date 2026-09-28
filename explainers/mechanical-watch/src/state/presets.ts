import type { ScenePreset } from '@core/scene/presetBinder';
import type { PartId, ViewOptions, WheelId } from '../ids';
import { WHEEL_IDS } from '../ids';
import { DEFAULT_AMPLITUDE_DEG, momentPhase } from '../model';

export type PresetId = 'overview' | 'mainspring' | 'train' | 'escapement' | 'balance' | 'hands';

export type CameraView = 'movement' | 'barrel' | 'wheel' | 'escapement' | 'balance' | 'dialSide';

export type ChapterControl = 'reserve' | 'regulator' | 'wheel' | 'beatRate';

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
  controls?: readonly ChapterControl[];
  highlightsSelectedWheel?: boolean;
}

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'movement',
    speed: 8,
    view: { dial: true, bridges: true, energy: true },
    labels: ['balanceWheel', 'barrel', 'escapeWheel', 'crown'],
    highlight: [],
  },
  mainspring: {
    camera: 'barrel',
    speed: 5,
    view: { bridges: false, energy: false },
    controls: ['reserve'],
    labels: ['mainspring', 'barrel', 'barrelArbor', 'ratchetWheel', 'crownWheel', 'click', 'crown'],
    highlight: [
      'mainspring',
      'barrel',
      'barrelArbor',
      'ratchetWheel',
      'crownWheel',
      'click',
      'stem',
      'crown',
      'windingPinion',
    ],
  },
  train: {
    camera: 'wheel',
    speed: 6,
    view: { bridges: false, energy: true },
    controls: ['wheel'],
    labels: ['barrel', 'centreWheel', 'thirdWheel', 'fourthWheel', 'escapeWheel', 'jewels'],
    highlight: WHEEL_IDS,
    highlightsSelectedWheel: true,
  },
  escapement: {
    camera: 'escapement',
    speed: 1,
    view: { bridges: false, energy: false },
    pauseAt: momentPhase('lock', DEFAULT_AMPLITUDE_DEG),
    labels: [
      'escapeWheel',
      'palletFork',
      'entryPallet',
      'exitPallet',
      'impulseJewel',
      'bankingPins',
    ],
    highlight: [
      'escapeWheel',
      'palletFork',
      'entryPallet',
      'exitPallet',
      'impulseJewel',
      'roller',
      'bankingPins',
    ],
  },
  balance: {
    camera: 'balance',
    speed: 3,
    view: { bridges: true, energy: false },
    startAt: 0,
    controls: ['reserve', 'regulator'],
    labels: ['balanceWheel', 'hairspring', 'stud', 'regulator', 'shockJewel', 'balanceCock'],
    highlight: ['balanceWheel', 'hairspring', 'stud', 'regulator', 'shockJewel'],
  },
  hands: {
    camera: 'dialSide',
    speed: 6,
    view: { dial: false, bridges: true },
    controls: ['beatRate'],
    labels: ['cannonPinion', 'minuteWheel', 'hourWheel', 'fourthWheel'],
    highlight: ['cannonPinion', 'minuteWheel', 'hourWheel', 'fourthWheel'],
  },
};

export function presetHighlight(preset: Preset, wheel: WheelId): readonly PartId[] {
  return preset.highlightsSelectedWheel ? [wheel] : preset.highlight;
}
