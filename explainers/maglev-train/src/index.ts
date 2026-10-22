import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountMaglevTrainScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createMaglevTrainStore } from './state';
import type { MaglevTrainStoreState } from './state';
import { MAGLEV_TRAIN_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  MAGLEV_TRAIN_CHOICES,
  MAGLEV_TRAIN_READOUTS,
  VIEW_TOGGLES,
  mountMaglevTrainUi,
} from './ui';

export default defineExplainer<MaglevTrainStoreState>({
  timeline: MAGLEV_TRAIN_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createMaglevTrainStore(),
  dock: { choices: MAGLEV_TRAIN_CHOICES, toggles: VIEW_TOGGLES },
  readouts: MAGLEV_TRAIN_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountMaglevTrainScene,
  mountUi: mountMaglevTrainUi,
});
