import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountMicroscopeScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createMicroscopeStore } from './state';
import type { MicroscopeStoreState } from './state';
import { MICROSCOPE_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  MICROSCOPE_CHOICES,
  MICROSCOPE_READOUTS,
  VIEW_TOGGLES,
  mountMicroscopeUi,
} from './ui';

export default defineExplainer<MicroscopeStoreState>({
  id: 'microscope',
  timeline: MICROSCOPE_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createMicroscopeStore(),
  dock: { choices: MICROSCOPE_CHOICES, toggles: VIEW_TOGGLES },
  readouts: MICROSCOPE_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountMicroscopeScene,
  mountUi: mountMicroscopeUi,
});
