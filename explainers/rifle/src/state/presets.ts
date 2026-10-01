import type { ScenePreset } from '@core/scene/presetBinder';
import type { CameraView, ComparisonId, GasPortId, PartId, PresetId, ViewOptions } from '../ids';
import { MOMENTS, unitsAt } from '../model';

export type ChapterControl = 'gasPort' | 'comparison';

export interface Preset extends ScenePreset<PartId, CameraView> {
  view?: Partial<ViewOptions>;
  controls?: readonly ChapterControl[];
}

export const DEFAULT_GAS_PORT: GasPortId = 'open';
export const DEFAULT_COMPARISON: ComparisonId = 'blink';

const CYCLE_START = 0;
const GAS_CHAPTER_MS = 4.8;
const RELOAD_CHAPTER_MS = 10;

const CUTAWAY_VIEW = { cutaway: true } as const;

export const PRESETS: Record<PresetId, Preset> = {
  overview: {
    camera: 'hero',
    speed: 1,
    view: { cutaway: false, gas: true, trail: true },
    startAt: CYCLE_START,
    labels: [
      'barrel',
      'gasTube',
      'receiver',
      'magazine',
      'stock',
      'chargingHandle',
      'selector',
      'muzzle',
    ],
    highlight: [],
  },
  cartridge: {
    camera: 'cartridge',
    speed: 0,
    view: CUTAWAY_VIEW,
    pauseAt: unitsAt(MOMENTS.strike),
    labels: ['primer', 'powder', 'cartridgeCase', 'bullet', 'chamber', 'firingPin'],
    highlight: ['primer', 'powder', 'cartridgeCase', 'bullet', 'firingPin'],
  },
  firing: {
    camera: 'action',
    speed: 0,
    view: CUTAWAY_VIEW,
    startAt: CYCLE_START,
    labels: ['hammer', 'firingPin', 'bolt', 'trunnion', 'trigger'],
    highlight: ['hammer', 'firingPin', 'bolt', 'trunnion'],
  },
  barrel: {
    camera: 'barrel',
    speed: 0,
    view: { cutaway: true, trail: true },
    startAt: unitsAt(MOMENTS.start),
    labels: ['bullet', 'barrel', 'gasPort', 'muzzle', 'hotGas'],
    highlight: ['bullet', 'barrel', 'hotGas'],
  },
  gas: {
    camera: 'gasSystem',
    speed: 0,
    view: { cutaway: true, gas: true },
    startAt: unitsAt(GAS_CHAPTER_MS),
    controls: ['gasPort'],
    labels: ['gasPort', 'gasBlock', 'pistonHead', 'gasTube', 'carrier', 'bolt'],
    highlight: ['gasPort', 'gasBlock', 'pistonHead', 'carrier', 'bolt', 'hotGas'],
  },
  reload: {
    camera: 'reload',
    speed: 1,
    view: CUTAWAY_VIEW,
    startAt: unitsAt(RELOAD_CHAPTER_MS),
    controls: ['comparison'],
    labels: ['extractor', 'ejector', 'spentCase', 'returnSpring', 'magazine', 'hammer', 'carrier'],
    highlight: ['extractor', 'ejector', 'spentCase', 'returnSpring', 'magazine', 'carrier', 'bolt'],
  },
};
