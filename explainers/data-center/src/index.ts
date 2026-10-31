import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountDataCenterScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createDataCenterStore } from './state';
import type { DataCenterStoreState } from './state';
import { DATA_CENTER_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  DATA_CENTER_CHOICES,
  DATA_CENTER_READOUTS,
  VIEW_TOGGLES,
  mountDataCenterUi,
} from './ui';

export default defineExplainer<DataCenterStoreState>({
  timeline: DATA_CENTER_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createDataCenterStore(),
  dock: { choices: DATA_CENTER_CHOICES, toggles: VIEW_TOGGLES },
  readouts: DATA_CENTER_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountDataCenterScene,
  mountUi: mountDataCenterUi,
});
